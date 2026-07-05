<?php
// api/barangays.php — CRUD for barangays
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();

// GET — return all or single barangay
if ($method === 'GET') {
    if (isset($_GET['id'])) {
        $stmt = $pdo->prepare("SELECT * FROM barangays WHERE id = ?");
        $stmt->execute([(int)$_GET['id']]);
        $row = $stmt->fetch();
        if (!$row) jsonResponse(['error' => 'Not found.'], 404);
        if ($row['geojson']) $row['geojson'] = json_decode($row['geojson'], true);
        jsonResponse($row);
    }

    if (isset($_GET['name'])) {
        $stmt = $pdo->prepare("SELECT * FROM barangays WHERE name = ?");
        $stmt->execute([$_GET['name']]);
        $row = $stmt->fetch();
        if (!$row) jsonResponse(['error' => 'Not found.'], 404);
        if ($row['geojson']) $row['geojson'] = json_decode($row['geojson'], true);
        jsonResponse($row);
    }

    $stmt = $pdo->query("SELECT * FROM barangays ORDER BY name ASC");
    $rows = $stmt->fetchAll();
    foreach ($rows as &$row) {
        if ($row['geojson']) $row['geojson'] = json_decode($row['geojson'], true);
    }
    jsonResponse($rows);
}

// PUT — update barangay info (admin)
if ($method === 'PUT') {
    $body = getRequestBody();
    $id   = (int)($body['id'] ?? 0);
    if (!$id) jsonResponse(['error' => 'ID required.'], 400);

    $allowed = ['name','captain','population','area','address','contact','description'];
    $set = []; $params = [];
    foreach ($allowed as $field) {
        if (array_key_exists($field, $body)) {
            $set[]    = "$field = ?";
            $params[] = $body[$field];
        }
    }
    if (empty($set)) jsonResponse(['error' => 'No fields to update.'], 400);

    if (isset($body['geojson'])) {
        $set[]    = "geojson = ?";
        $params[] = json_encode($body['geojson']);
    }

    $params[] = $id;
    $pdo->prepare("UPDATE barangays SET " . implode(', ', $set) . " WHERE id = ?")->execute($params);
    jsonResponse(['success' => true, 'message' => 'Barangay updated.']);
}

jsonResponse(['error' => 'Method not allowed.'], 405);
