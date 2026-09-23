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

// POST — create new barangay (admin)
if ($method === 'POST') {
    $body = getRequestBody();
    $name = trim($body['name'] ?? '');
    if (!$name) jsonResponse(['error' => 'Barangay name is required.'], 400);

    $captain     = $body['captain'] ?? null;
    $population  = isset($body['population']) && $body['population'] !== '' ? (int)$body['population'] : null;
    $area        = $body['area'] ?? null;
    $address     = $body['address'] ?? null;
    $contact     = $body['contact'] ?? null;
    $description = $body['description'] ?? null;
    $geojson     = isset($body['geojson']) ? json_encode($body['geojson']) : null;

    try {
        $stmt = $pdo->prepare("
            INSERT INTO barangays (name, captain, population, area, address, contact, description, geojson)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$name, $captain, $population, $area, $address, $contact, $description, $geojson]);

        jsonResponse(['success' => true, 'id' => (int)$pdo->lastInsertId(), 'message' => 'Barangay created successfully.']);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) {
            jsonResponse(['error' => 'A barangay with this name already exists.'], 400);
        }
        jsonResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
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

// DELETE — delete barangay (admin)
if ($method === 'DELETE') {
    $body = getRequestBody();
    $id   = (int)($body['id'] ?? $_GET['id'] ?? 0);
    if (!$id) jsonResponse(['error' => 'Barangay ID required.'], 400);

    $stmt = $pdo->prepare("DELETE FROM barangays WHERE id = ?");
    $stmt->execute([$id]);

    jsonResponse(['success' => true, 'message' => 'Barangay deleted.']);
}

jsonResponse(['error' => 'Method not allowed.'], 405);
