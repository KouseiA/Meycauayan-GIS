<?php
/**
 * database/update_geojson.php
 * Run this to update the meycauayan_gis database's barangays table with the correct GeoJSON boundaries.
 */

$host    = 'localhost';
$user    = 'root';
$pass    = '';
$db      = 'meycauayan_gis';
$charset = 'utf8mb4';

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$db;charset=$charset",
        $user, $pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );
} catch (PDOException $e) {
    die("<h2 style='color:red'>DB Error: " . htmlspecialchars($e->getMessage()) . "</h2>");
}

echo "Database connection successful!\n";

$geojsonPath = __DIR__ . '/meycauayan-barangays.geojson';
if (!file_exists($geojsonPath)) {
    // Try root path if not in database/
    $geojsonPath = dirname(__DIR__) . '/meycauayan-barangays.geojson';
}

if (!file_exists($geojsonPath)) {
    die("Error: meycauayan-barangays.geojson not found!\n");
}

$rawGeoJSON = file_get_contents($geojsonPath);
$geojson = json_decode($rawGeoJSON, true);

if (!$geojson || !isset($geojson['features'])) {
    die("Error: Invalid GeoJSON format!\n");
}

echo "Found " . count($geojson['features']) . " features in GeoJSON.\n";

$stmt = $pdo->prepare("UPDATE barangays SET geojson = ? WHERE name = ?");

$updated = 0;
foreach ($geojson['features'] as $feature) {
    $name = $feature['properties']['barangay'] ?? null;
    if (!$name) {
        continue;
    }
    
    // Clean name for match
    $name = trim($name);
    
    // Convert feature back to JSON string
    $featureJson = json_encode($feature);
    
    // Run update
    $stmt->execute([$featureJson, $name]);
    
    if ($stmt->rowCount() > 0) {
        echo "Updated DB boundary for: {$name}\n";
        $updated++;
    } else {
        // Maybe it has no changes, or name doesn't exist
        echo "No changes or name mismatch for: {$name}\n";
    }
}

echo "\nDone! Successfully updated {$updated} barangay boundaries in the database.\n";
