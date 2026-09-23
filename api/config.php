<?php
// api/config.php — Database configuration
// -----------------------------------------------------------------
// Environment-aware: reads from env vars in production,
// falls back to XAMPP defaults for local development.
// -----------------------------------------------------------------

// Detect environment: set GIS_ENV=production or auto-detect Railway environment
define('APP_ENV', getenv('GIS_ENV') ?: (getenv('RAILWAY_ENVIRONMENT') ? 'production' : 'development'));

// Database credentials — support standard, Railway URL, and Railway MYSQL* env variables
$dbUrl = getenv('DATABASE_URL') ?: getenv('MYSQL_URL');
$dbHost = 'localhost';
$dbPort = '3306';
$dbUser = 'root';
$dbPass = '';
$dbName = 'meycauayan_gis';

if ($dbUrl) {
    $parsed = parse_url($dbUrl);
    if ($parsed) {
        $dbHost = $parsed['host'] ?? $dbHost;
        $dbPort = (string)($parsed['port'] ?? $dbPort);
        $dbUser = $parsed['user'] ?? $dbUser;
        $dbPass = $parsed['pass'] ?? $dbPass;
        $dbName = ltrim($parsed['path'] ?? $dbName, '/');
    }
} else {
    $dbHost = getenv('GIS_DB_HOST') ?: (getenv('MYSQLHOST') ?: (getenv('MYSQL_HOST') ?: 'localhost'));
    $dbPort = (string)(getenv('GIS_DB_PORT') ?: (getenv('MYSQLPORT') ?: (getenv('MYSQL_PORT') ?: '3306')));
    $dbUser = getenv('GIS_DB_USER') ?: (getenv('MYSQLUSER') ?: (getenv('MYSQL_USER') ?: 'root'));
    $dbPass = getenv('GIS_DB_PASS') ?: (getenv('MYSQLPASSWORD') ?: (getenv('MYSQL_PASSWORD') ?: ''));
    $dbName = getenv('GIS_DB_NAME') ?: (getenv('MYSQLDATABASE') ?: (getenv('MYSQL_DATABASE') ?: 'meycauayan_gis'));
}

define('DB_HOST',    $dbHost);
define('DB_PORT',    $dbPort);
define('DB_USER',    $dbUser);
define('DB_PASS',    $dbPass);
define('DB_NAME',    $dbName);
define('DB_CHARSET', 'utf8mb4');

// CORS origin — set GIS_CORS_ORIGIN to your domain in production
define('CORS_ORIGIN', getenv('GIS_CORS_ORIGIN') ?: '*');

/**
 * Returns a PDO connection to the MySQL database.
 */
function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::MYSQL_ATTR_MULTI_STATEMENTS => true,
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            // Hide detailed error in production
            $msg = (APP_ENV === 'development')
                ? 'Database connection failed: ' . $e->getMessage()
                : 'Database connection failed. Please try again later.';
            echo json_encode(['error' => $msg]);
            exit;
        }
    }
    return $pdo;
}

/**
 * Send a JSON response and exit.
 */
function jsonResponse(mixed $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: ' . CORS_ORIGIN);
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

/**
 * Get JSON body from request.
 */
function getRequestBody(): array {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?? [];
}

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: ' . CORS_ORIGIN);
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    http_response_code(204);
    exit;
}
