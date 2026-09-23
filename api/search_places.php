<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$q = isset($_GET['q']) ? trim($_GET['q']) : '';
if (strlen($q) < 2) {
    echo json_encode([]);
    exit;
}

$results = [];
$qLower = mb_strtolower($q, 'UTF-8');
$tokens = array_filter(preg_split('/[\s,.-]+/', $qLower), function($t) { return strlen($t) > 1; });

// 1. Search in data/meycauayan_landmarks.json
$landmarksFile = __DIR__ . '/../data/meycauayan_landmarks.json';
if (file_exists($landmarksFile)) {
    $landmarks = json_decode(file_get_contents($landmarksFile), true);
    if ($landmarks) {
        foreach ($landmarks as $lm) {
            $nameLower = mb_strtolower($lm['name'], 'UTF-8');
            $streetLower = mb_strtolower($lm['street'] ?? '', 'UTF-8');
            $brgyLower = mb_strtolower($lm['barangay'] ?? '', 'UTF-8');
            $catLower = mb_strtolower($lm['category'] ?? '', 'UTF-8');
            
            $matchScore = 0;
            if (stripos($nameLower, $qLower) !== false) {
                $matchScore = 200;
            } else {
                foreach ($tokens as $tok) {
                    if (stripos($nameLower, $tok) !== false || stripos($streetLower, $tok) !== false || stripos($catLower, $tok) !== false) {
                        $matchScore += 40;
                    }
                }
            }
            
            if ($matchScore > 0) {
                $icon = 'fas fa-location-dot';
                if (stripos($catLower, 'police') !== false) $icon = 'fas fa-shield-halved';
                else if (stripos($catLower, 'fire') !== false) $icon = 'fas fa-fire';
                else if (stripos($catLower, 'hospital') !== false) $icon = 'fas fa-hospital';
                else if (stripos($catLower, 'health') !== false) $icon = 'fas fa-kit-medical';
                else if (stripos($catLower, 'cdrrmo') !== false) $icon = 'fas fa-triangle-exclamation';
                else if (stripos($catLower, 'barangay hall') !== false || stripos($catLower, 'hall') !== false) $icon = 'fas fa-landmark';

                $subParts = array_filter([$lm['category'] ?? '', $lm['street'] ?? '', !empty($lm['barangay']) ? 'Brgy. ' . $lm['barangay'] : '']);
                $results[] = [
                    'title' => $lm['name'],
                    'subtitle' => implode(', ', $subParts),
                    'fullAddress' => $lm['name'] . ', ' . ($lm['street'] ?? '') . ', Brgy. ' . ($lm['barangay'] ?? '') . ', Meycauayan City',
                    'lat' => (float)$lm['lat'],
                    'lng' => (float)$lm['lng'],
                    'icon' => $icon,
                    'barangay' => $lm['barangay'] ?? '',
                    'score' => $matchScore + 100
                ];
            }
        }
    }
}

// 2. Search in data/meycauayan_pois.json (8,599 places)
$poisFile = __DIR__ . '/../data/meycauayan_pois.json';
if (file_exists($poisFile)) {
    $pois = json_decode(file_get_contents($poisFile), true);
    if ($pois) {
        foreach ($pois as $p) {
            $nameLower = mb_strtolower($p['name'], 'UTF-8');
            $streetLower = mb_strtolower($p['street'] ?? '', 'UTF-8');
            
            $matchScore = 0;
            if (stripos($nameLower, $qLower) !== false) {
                $matchScore = 80;
            } else {
                foreach ($tokens as $tok) {
                    if (stripos($nameLower, $tok) !== false || stripos($streetLower, $tok) !== false) {
                        $matchScore += 15;
                    }
                }
            }
            
            if ($matchScore > 0) {
                $subParts = array_filter([$p['street'] ?? '', $p['suburb'] ?? '', "Meycauayan, Bulacan"]);
                $results[] = [
                    'title' => $p['name'],
                    'subtitle' => implode(', ', $subParts),
                    'fullAddress' => $p['name'] . ', ' . ($p['street'] ?? '') . ', Meycauayan City',
                    'lat' => (float)$p['lat'],
                    'lng' => (float)$p['lng'],
                    'icon' => 'fas fa-location-dot',
                    'barangay' => $p['suburb'] ?? '',
                    'score' => $matchScore
                ];
            }
            if (count($results) >= 20) break;
        }
    }
}

// 3. Photon Geocoding Live Fallback
if (count($results) < 5) {
    try {
        $searchQuery = (stripos($q, 'meycauayan') !== false) ? $q : "$q Meycauayan Bulacan";
        $url = "https://photon.komoot.io/api/?q=" . urlencode($searchQuery) . "&lat=14.7368&lon=120.9610&limit=5";
        $opts = ['http' => ['method' => 'GET', 'header' => "User-Agent: MeycauayanGIS/1.0\r\n", 'timeout' => 2]];
        $json = @file_get_contents($url, false, stream_context_create($opts));
        if ($json) {
            $data = json_decode($json, true);
            if (!empty($data['features'])) {
                foreach ($data['features'] as $f) {
                    $props = $f['properties'] ?? [];
                    $coords = $f['geometry']['coordinates'] ?? null;
                    if ($coords && count($coords) >= 2) {
                        $name = $props['name'] ?? $props['street'] ?? '';
                        if ($name) {
                            $subParts = array_filter([$props['street'] ?? '', $props['district'] ?? '', $props['city'] ?? 'Meycauayan', 'Bulacan']);
                            $results[] = [
                                'title' => $name,
                                'subtitle' => implode(', ', $subParts),
                                'fullAddress' => $name . ', ' . ($props['street'] ?? '') . ', Meycauayan City',
                                'lat' => (float)$coords[1],
                                'lng' => (float)$coords[0],
                                'icon' => 'fas fa-location-dot',
                                'barangay' => $props['district'] ?? '',
                                'score' => 30
                            ];
                        }
                    }
                }
            }
        }
    } catch(Exception $e) {}
}

// Deduplicate and Sort
usort($results, function($a, $b) {
    return ($b['score'] ?? 0) - ($a['score'] ?? 0);
});

$unique = [];
$output = [];
foreach ($results as $r) {
    $key = round($r['lat'], 4) . '_' . round($r['lng'], 4);
    if (!isset($unique[$key])) {
        $unique[$key] = true;
        $output[] = $r;
    }
}

echo json_encode(array_slice($output, 0, 8), JSON_UNESCAPED_UNICODE);
