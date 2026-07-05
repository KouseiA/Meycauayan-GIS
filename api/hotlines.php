<?php
// api/hotlines.php — Emergency hotlines CRUD
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM hotlines ORDER BY sort_order, id ASC");
    jsonResponse($stmt->fetchAll());
}

if ($method === 'POST') {
    $body = getRequestBody();
    if (empty($body['name'])) jsonResponse(['error' => 'Name is required.'], 400);

    $stmt = $pdo->prepare("
        INSERT INTO hotlines (name, category, local_number, national_number, icon_class, sort_order)
        VALUES (?,?,?,?,?,?)
    ");
    $stmt->execute([
        $body['name'],
        $body['category']       ?? null,
        $body['local_number']   ?? null,
        $body['national_number']?? null,
        $body['icon_class']     ?? 'fa-phone',
        (int)($body['sort_order'] ?? 0),
    ]);
    jsonResponse(['success' => true, 'id' => $pdo->lastInsertId()], 201);
}

if ($method === 'PUT') {
    $body = getRequestBody();
    $id   = (int)($body['id'] ?? 0);
    if (!$id) jsonResponse(['error' => 'ID required.'], 400);

    $allowed = ['name','category','local_number','national_number','icon_class','sort_order'];
    $set = []; $params = [];
    foreach ($allowed as $f) {
        if (array_key_exists($f, $body)) { $set[] = "$f = ?"; $params[] = $body[$f]; }
    }
    if (empty($set)) jsonResponse(['error' => 'Nothing to update.'], 400);
    $params[] = $id;
    $pdo->prepare("UPDATE hotlines SET " . implode(', ', $set) . " WHERE id = ?")->execute($params);
    jsonResponse(['success' => true]);
}

if ($method === 'DELETE') {
    $body = getRequestBody();
    $id   = (int)($body['id'] ?? ($_GET['id'] ?? 0));
    if (!$id) jsonResponse(['error' => 'ID required.'], 400);
    $stmt = $pdo->prepare("DELETE FROM hotlines WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['success' => true]);
}

jsonResponse(['error' => 'Method not allowed.'], 405);
