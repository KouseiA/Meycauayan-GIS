<?php
// api/announcements.php — Ticker announcements CRUD
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();

if ($method === 'GET') {
    $active = isset($_GET['active']) ? " WHERE is_active = 1" : "";
    $stmt = $pdo->query("SELECT * FROM announcements$active ORDER BY sort_order, id ASC");
    jsonResponse($stmt->fetchAll());
}

if ($method === 'POST') {
    $body = getRequestBody();
    if (empty($body['message'])) jsonResponse(['error' => 'Message is required.'], 400);

    $stmt = $pdo->prepare("
        INSERT INTO announcements (message, is_active, sort_order)
        VALUES (?,?,?)
    ");
    $stmt->execute([
        $body['message'],
        isset($body['is_active']) ? (int)$body['is_active'] : 1,
        (int)($body['sort_order'] ?? 0),
    ]);
    jsonResponse(['success' => true, 'id' => $pdo->lastInsertId()], 201);
}

if ($method === 'PUT') {
    $body = getRequestBody();
    $id   = (int)($body['id'] ?? 0);
    if (!$id) jsonResponse(['error' => 'ID required.'], 400);

    $allowed = ['message','is_active','sort_order'];
    $set = []; $params = [];
    foreach ($allowed as $f) {
        if (array_key_exists($f, $body)) { $set[] = "$f = ?"; $params[] = $body[$f]; }
    }
    if (empty($set)) jsonResponse(['error' => 'Nothing to update.'], 400);
    $params[] = $id;
    $pdo->prepare("UPDATE announcements SET " . implode(', ', $set) . " WHERE id = ?")->execute($params);
    jsonResponse(['success' => true]);
}

if ($method === 'DELETE') {
    $body = getRequestBody();
    $id   = (int)($body['id'] ?? ($_GET['id'] ?? 0));
    if (!$id) jsonResponse(['error' => 'ID required.'], 400);
    $stmt = $pdo->prepare("DELETE FROM announcements WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['success' => true]);
}

jsonResponse(['error' => 'Method not allowed.'], 405);
