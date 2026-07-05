<?php
// api/facilities.php — Full CRUD for facilities
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();

// GET
if ($method === 'GET') {
    $where  = [];
    $params = [];

    if (!empty($_GET['type'])) {
        $where[]  = "type = ?";
        $params[] = $_GET['type'];
    }
    if (!empty($_GET['barangay'])) {
        $where[]  = "barangay = ?";
        $params[] = $_GET['barangay'];
    }
    if (!empty($_GET['id'])) {
        $stmt = $pdo->prepare("SELECT * FROM facilities WHERE id = ?");
        $stmt->execute([$_GET['id']]);
        $row = $stmt->fetch();
        if (!$row) jsonResponse(['error' => 'Not found.'], 404);
        if ($row['services']) $row['services'] = json_decode($row['services'], true);
        jsonResponse($row);
    }

    $sql = "SELECT * FROM facilities";
    if ($where) $sql .= " WHERE " . implode(' AND ', $where);
    $sql .= " ORDER BY type, name ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    foreach ($rows as &$row) {
        if ($row['services']) $row['services'] = json_decode($row['services'], true);
    }
    jsonResponse($rows);
}

// POST — create new facility
if ($method === 'POST') {
    $body = getRequestBody();
    $required = ['id', 'name', 'type', 'lat', 'lng'];
    foreach ($required as $f) {
        if (empty($body[$f])) jsonResponse(['error' => "Field '$f' is required."], 400);
    }

    $types = ['police','fire','hospital','healthCenter'];
    if (!in_array($body['type'], $types)) {
        jsonResponse(['error' => 'Invalid type. Must be: police, fire, hospital, or healthCenter.'], 400);
    }

    $stmt = $pdo->prepare("
        INSERT INTO facilities
          (id, name, type, subtype, barangay, address, contact, emergency_hotline,
           person_in_charge, operating_hours, lat, lng, google_maps_url, services)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ");
    $stmt->execute([
        $body['id'],
        $body['name'],
        $body['type'],
        $body['subtype']          ?? null,
        $body['barangay']         ?? null,
        $body['address']          ?? null,
        $body['contact']          ?? null,
        $body['emergency_hotline']?? null,
        $body['person_in_charge'] ?? null,
        $body['operating_hours']  ?? null,
        (float)$body['lat'],
        (float)$body['lng'],
        $body['google_maps_url']  ?? null,
        isset($body['services']) ? json_encode($body['services']) : null,
    ]);

    jsonResponse(['success' => true, 'message' => 'Facility created.', 'id' => $body['id']], 201);
}

// PUT — update facility
if ($method === 'PUT') {
    $body = getRequestBody();
    $id   = $body['id'] ?? '';
    if (!$id) jsonResponse(['error' => 'ID required.'], 400);

    $allowed = ['name','type','subtype','barangay','address','contact','emergency_hotline',
                'person_in_charge','operating_hours','lat','lng','google_maps_url'];
    $set = []; $params = [];

    foreach ($allowed as $field) {
        if (array_key_exists($field, $body)) {
            $set[]    = "$field = ?";
            $params[] = $body[$field];
        }
    }
    if (isset($body['services'])) {
        $set[]    = "services = ?";
        $params[] = json_encode($body['services']);
    }
    if (empty($set)) jsonResponse(['error' => 'No fields to update.'], 400);

    $params[] = $id;
    $pdo->prepare("UPDATE facilities SET " . implode(', ', $set) . " WHERE id = ?")->execute($params);
    jsonResponse(['success' => true, 'message' => 'Facility updated.']);
}

// DELETE
if ($method === 'DELETE') {
    $body = getRequestBody();
    $id   = $body['id'] ?? ($_GET['id'] ?? '');
    if (!$id) jsonResponse(['error' => 'ID required.'], 400);

    $stmt = $pdo->prepare("DELETE FROM facilities WHERE id = ?");
    $stmt->execute([$id]);
    if ($stmt->rowCount() === 0) jsonResponse(['error' => 'Facility not found.'], 404);
    jsonResponse(['success' => true, 'message' => 'Facility deleted.']);
}

jsonResponse(['error' => 'Method not allowed.'], 405);
