<?php
// api/auth.php — Admin login endpoint
require_once __DIR__ . '/config.php';

session_start();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $body = getRequestBody();
    $username = trim($body['username'] ?? '');
    $password = $body['password'] ?? '';

    if (!$username || !$password) {
        jsonResponse(['error' => 'Username and password required.'], 400);
    }

    $pdo  = getDB();
    $stmt = $pdo->prepare("SELECT id, username, password_hash FROM admin_users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password_hash'])) {
        $_SESSION['admin_id']   = $user['id'];
        $_SESSION['admin_user'] = $user['username'];
        jsonResponse([
            'success'  => true,
            'username' => $user['username'],
            'token'    => base64_encode($user['id'] . ':' . session_id())
        ]);
    } else {
        jsonResponse(['error' => 'Invalid credentials.'], 401);
    }
}

if ($method === 'DELETE') {
    // Logout
    session_destroy();
    jsonResponse(['success' => true, 'message' => 'Logged out.']);
}

jsonResponse(['error' => 'Method not allowed.'], 405);
