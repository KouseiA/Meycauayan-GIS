<?php
/**
 * database/seed.php
 * Visit http://localhost/kevin/database/seed.php ONCE to populate the database.
 * Delete or restrict this file after seeding.
 */

// Direct DB connection (bypass config path issues)
$host    = 'localhost';
$user    = 'root';
$pass    = '';
$db      = 'meycauayan_gis';
$charset = 'utf8mb4';

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$db;charset=$charset",
        $user, $pass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
} catch (PDOException $e) {
    die("<h2 style='color:red'>DB Error: " . htmlspecialchars($e->getMessage()) . "</h2>
         <p>Make sure you have:<br>
         1. Started XAMPP Apache + MySQL<br>
         2. Imported <code>database/schema.sql</code> in phpMyAdmin first</p>");
}

$pdo->exec("SET FOREIGN_KEY_CHECKS = 0; TRUNCATE TABLE facilities; TRUNCATE TABLE barangays; SET FOREIGN_KEY_CHECKS = 1;");
$log = ["Database tables truncated (fresh seed)"];

// ---------------------------------------------------------------
// FACILITIES
// ---------------------------------------------------------------
$facilities = [
  // POLICE
  ['pol-001','Meycauayan City Police Station','police','Main Station','Tugatog','Brgy. Tugatog, Meycauayan City, Bulacan 3020','To be verified / (044) 228-2777','117','PCol. Jose R. Dela Torre','24 Hours / 7 Days a Week',14.7265,120.9630,'https://www.google.com/maps/search/Meycauayan+City+Police+Station/@14.7265,120.9630,17z',null],
  ['pol-002','Police Community Precinct 1','police','Community Precinct','Calvario','Brgy. Calvario, Meycauayan City, Bulacan 3020','To be verified','117','PSI. Ricardo M. Santos','24 Hours / 7 Days a Week',14.735104,120.959620,'https://www.google.com/maps/search/Police+Community+Precinct+Calvario+Meycauayan/@14.735104,120.959620,17z',null],
  ['pol-003','Police Community Precinct 2','police','Community Precinct','Bagbaguin','Brgy. Bagbaguin, Meycauayan City, Bulacan 3020','To be verified','117','PSI. Alicia V. Mendoza','24 Hours / 7 Days a Week',14.759854,121.003908,'https://www.google.com/maps/search/Police+Community+Precinct+Bagbaguin+Meycauayan/@14.759854,121.003908,17z',null],
  ['pol-004','Police Community Precinct 3','police','Community Precinct','Pandayan','Brgy. Pandayan, Meycauayan City, Bulacan 3020','To be verified','117','PSI. Eduardo F. Cruz','24 Hours / 7 Days a Week',14.757653,120.977292,'https://www.google.com/maps/search/Police+Community+Precinct+Pandayan+Meycauayan/@14.757653,120.977292,17z',null],
  ['pol-005','Police Community Precinct 4','police','Community Precinct','Poblacion','Brgy. Poblacion, Meycauayan City, Bulacan 3020','To be verified','117','PSI. Gloria N. Pascual','24 Hours / 7 Days a Week',14.737221,120.957169,'https://www.google.com/maps/search/Police+Community+Precinct+Poblacion+Meycauayan/@14.737221,120.957169,17z',null],
  // FIRE
  ['fire-001','Meycauayan City Fire Station','fire','Main Fire Station','Malhacan','Brgy. Malhacan, Meycauayan City, Bulacan 3020','To be verified / (044) 228-3000','160','SFO4 Manuel A. Reyes','24 Hours / 7 Days a Week',14.741071,120.969786,'https://www.google.com/maps/search/Meycauayan+City+Fire+Station/@14.741071,120.969786,17z',null],
  ['fire-002','BFP Sub-Station (Northern District)','fire','Sub-Station','Saluysoy','Brgy. Saluysoy, Meycauayan City, Bulacan 3020','To be verified','160','FO3 Lito C. Fernandez','24 Hours / 7 Days a Week',14.7490,120.9540,'https://www.google.com/maps/search/BFP+Sub+Station+Camalig+Meycauayan/@14.7490,120.9540,17z',null],
  // HOSPITALS
  ['hosp-001','Meycauayan District Hospital','hospital','Government Hospital','Perez','Brgy. Perez, Meycauayan City, Bulacan 3020','To be verified / (044) 228-0001','To be verified loc. 100','Dr. Ana Maria L. Santos, MD','24 Hours / 7 Days a Week',14.762918,120.998974,'https://www.google.com/maps/search/Meycauayan+District+Hospital/@14.762918,120.998974,17z','["Emergency","Maternity","Surgery","Pediatrics","Internal Medicine"]'],
  ['hosp-002','St. Francis Medical Center - Meycauayan','hospital','Private Hospital','Pandayan','Brgy. Pandayan, Meycauayan City, Bulacan 3020','To be verified / (044) 228-4444','To be verified loc. 0','Dr. Carlos T. Mendoza, MD','24 Hours / 7 Days a Week',14.757653,120.977292,'https://www.google.com/maps/search/St+Francis+Medical+Center+Meycauayan/@14.757653,120.977292,17z','["Emergency","Surgery","OB-Gyne","Pediatrics","Cardiology"]'],
  ['hosp-003','Meycauayan Medical Center','hospital','Private Hospital','Bayugo','Brgy. Bayugo, Meycauayan City, Bulacan 3020','To be verified','To be verified loc. 9','Dr. Helen R. Garcia, MD','24 Hours / 7 Days a Week',14.7321,120.9530,'https://www.google.com/maps/search/Meycauayan+Medical+Center/@14.7321,120.9530,17z','["Emergency","Surgery","Internal Medicine","Diagnostics"]'],
  // HEALTH CENTERS
  ['hc-001','Bagbaguin Barangay Health Center','healthCenter','Barangay Health Center','Bagbaguin','Brgy. Bagbaguin, Meycauayan City, Bulacan 3020','To be verified',null,'RHM Josefina M. Santos','Monday - Friday, 8:00 AM - 5:00 PM',14.759854,121.003908,'https://www.google.com/maps/search/Bagbaguin+Health+Center+Meycauayan/@14.759854,121.003908,17z','["Prenatal Care","Immunization","Family Planning","Maternal Health"]'],
  ['hc-002','Bancal Barangay Health Center','healthCenter','Barangay Health Center','Bancal','Brgy. Bancal, Meycauayan City, Bulacan 3020','To be verified',null,'RHM Maria C. Dela Cruz','Monday - Friday, 8:00 AM - 5:00 PM',14.725864,120.958245,'https://www.google.com/maps/search/Bancal+Health+Center+Meycauayan/@14.725864,120.958245,17z','["Prenatal Care","Immunization","Family Planning","Well-baby Clinic"]'],
  ['hc-003','Banga Barangay Health Center','healthCenter','Barangay Health Center','Banga','Brgy. Banga, Meycauayan City, Bulacan 3020','To be verified',null,'RHM Cynthia O. Reyes','Monday - Friday, 8:00 AM - 5:00 PM',14.7300,120.9800,'https://www.google.com/maps/search/Banga+Health+Center+Meycauayan/@14.7300,120.9800,17z','["Prenatal Care","Immunization","TB DOTS","Family Planning"]'],
  ['hc-004','Bayugo Barangay Health Center','healthCenter','Barangay Health Center','Bayugo','Brgy. Bayugo, Meycauayan City, Bulacan 3020','To be verified',null,'RHM Eduardo V. Villanueva','Monday - Friday, 8:00 AM - 5:00 PM',14.733942,120.952701,'https://www.google.com/maps/search/Bayugo+Health+Center+Meycauayan/@14.733942,120.952701,17z','["Prenatal Care","Immunization","Senior Citizen Clinic"]'],
  ['hc-005','Calvario Barangay Health Center','healthCenter','Barangay Health Center','Calvario','Brgy. Calvario, Meycauayan City, Bulacan 3020','To be verified',null,'RHM Jose L. Mendoza','Monday - Friday, 8:00 AM - 5:00 PM',14.735104,120.959620,'https://www.google.com/maps/search/Calvario+Health+Center+Meycauayan/@14.735104,120.959620,17z','["Prenatal Care","Immunization","Family Planning","Dental Health"]'],
  ['hc-006','Camalig Barangay Health Center','healthCenter','Barangay Health Center','Camalig','Brgy. Camalig, Meycauayan City, Bulacan 3020','To be verified',null,'RHM Leonora A. Garcia','Monday - Friday, 8:00 AM - 5:00 PM',14.771752,120.993208,'https://www.google.com/maps/search/Camalig+Health+Center+Meycauayan/@14.771752,120.993208,17z','["Prenatal Care","Immunization","Well-baby Clinic","Nutrition Program"]'],
  ['hc-007','Hulo Barangay Health Center','healthCenter','Barangay Health Center','Hulo','Brgy. Hulo, Meycauayan City, Bulacan 3020','To be verified',null,'RHM Arnaldo B. Pascual','Monday - Friday, 8:00 AM - 5:00 PM',14.731241,120.957902,'https://www.google.com/maps/search/Hulo+Health+Center+Meycauayan/@14.731241,120.957902,17z','["Prenatal Care","Immunization","Family Planning","TB DOTS"]'],
  ['hc-008','Langka Barangay Health Center','healthCenter','Barangay Health Center','Langka','Brgy. Langka, Meycauayan City, Bulacan 3020','To be verified',null,'RHM Florencia G. Aquino','Monday - Friday, 8:00 AM - 5:00 PM',14.738371,120.979226,'https://www.google.com/maps/search/Langka+Health+Center+Meycauayan/@14.738371,120.979226,17z','["Prenatal Care","Immunization","Senior Citizen Clinic","Family Planning"]'],
  ['hc-009','Libtong Barangay Health Center','healthCenter','Barangay Health Center','Libtong','Brgy. Libtong, Meycauayan City, Bulacan 3020','To be verified',null,'RHM Richard A. Torres','Monday - Friday, 8:00 AM - 5:00 PM',14.746488,120.981730,'https://www.google.com/maps/search/Libtong+Health+Center+Meycauayan/@14.746488,120.981730,17z','["Prenatal Care","Immunization","Family Planning","Dental Health"]'],
  ['hc-010','Liputan Barangay Health Center','healthCenter','Barangay Health Center','Liputan','Brgy. Liputan, Meycauayan City, Bulacan 3020','To be verified',null,'RHM Angelica P. Gutierrez','Monday - Friday, 8:00 AM - 5:00 PM',14.742728,120.931165,'https://www.google.com/maps/search/Liputan+Health+Center+Meycauayan/@14.742728,120.931165,17z','["Prenatal Care","Immunization","Well-baby Clinic"]'],
  ['hc-011','Malhacan Barangay Health Center','healthCenter','Barangay Health Center','Malhacan','Brgy. Malhacan, Meycauayan City, Bulacan 3020','To be verified',null,'RHM Benjamin O. Soriano','Monday - Friday, 8:00 AM - 5:00 PM',14.741071,120.969786,'https://www.google.com/maps/search/Malhacan+Health+Center+Meycauayan/@14.741071,120.969786,17z','["Prenatal Care","Immunization","Family Planning","TB DOTS","Nutrition Program"]'],
  ['hc-012','Pajo Barangay Health Center','healthCenter','Barangay Health Center','Pajo','Brgy. Pajo, Meycauayan City, Bulacan 3020','To be verified',null,'RHM Teresita H. Navarro','Monday - Friday, 8:00 AM - 5:00 PM',14.777429,121.009459,'https://www.google.com/maps/search/Pajo+Health+Center+Meycauayan/@14.777429,121.009459,17z','["Prenatal Care","Immunization","Senior Citizen Clinic","Family Planning"]'],
  ['hc-013','Pandayan Barangay Health Center','healthCenter','Barangay Health Center','Pandayan','Brgy. Pandayan, Meycauayan City, Bulacan 3020','To be verified',null,'RHM Alfredo S. Cruz','Monday - Friday, 8:00 AM - 5:00 PM',14.757653,120.977292,'https://www.google.com/maps/search/Pandayan+Health+Center+Meycauayan/@14.757653,120.977292,17z','["Prenatal Care","Immunization","Family Planning","TB DOTS","Dental Health"]'],
  ['hc-014','Perez Barangay Health Center','healthCenter','Barangay Health Center','Perez','Brgy. Perez, Meycauayan City, Bulacan 3020','To be verified',null,'RHM Maricel T. Reyes','Monday - Friday, 8:00 AM - 5:00 PM',14.762918,120.998974,'https://www.google.com/maps/search/Perez+Health+Center+Meycauayan/@14.762918,120.998974,17z','["Prenatal Care","Immunization","Family Planning","Well-baby Clinic"]'],
  ['hc-015','Poblacion Barangay Health Center','healthCenter','Barangay Health Center','Poblacion','Brgy. Poblacion, Meycauayan City, Bulacan 3020','To be verified',null,'RHM Gregorio F. Lim','Monday - Friday, 8:00 AM - 5:00 PM',14.737221,120.957169,'https://www.google.com/maps/search/Poblacion+Health+Center+Meycauayan/@14.737221,120.957169,17z','["Prenatal Care","Immunization","Family Planning","Senior Citizen Clinic"]'],
  ['hc-016','Saluysoy Barangay Health Center','healthCenter','Barangay Health Center','Saluysoy','Brgy. Saluysoy, Meycauayan City, Bulacan 3020','To be verified',null,'RHM Lourdes M. Bautista','Monday - Friday, 8:00 AM - 5:00 PM',14.743190,120.952307,'https://www.google.com/maps/search/Saluysoy+Health+Center+Meycauayan/@14.743190,120.952307,17z','["Prenatal Care","Immunization","Family Planning","Nutrition Program"]'],
  ['hc-017','Gasak Barangay Health Center','healthCenter','Barangay Health Center','Gasak','Brgy. Gasak, Meycauayan City, Bulacan 3020','To be verified',null,'RHM Dennis B. Abad','Monday - Friday, 8:00 AM - 5:00 PM',14.733975,120.956668,'https://www.google.com/maps/search/Gasak+Health+Center+Meycauayan/@14.733975,120.956668,17z','["Prenatal Care","Immunization","Well-baby Clinic","Family Planning"]'],
  ['hc-018','Iba Barangay Health Center','healthCenter','Barangay Health Center','Iba','Brgy. Iba, Meycauayan City, Bulacan 3020','To be verified',null,'RHM Carmelita G. Felipe','Monday - Friday, 8:00 AM - 5:00 PM',14.756465,120.980762,'https://www.google.com/maps/search/Iba+Health+Center+Meycauayan/@14.756465,120.980762,17z','["Prenatal Care","Immunization","Family Planning","TB DOTS"]'],
  ['hc-019','Lawa Barangay Health Center','healthCenter','Barangay Health Center','Lawa','Brgy. Lawa, Meycauayan City, Bulacan 3020','To be verified',null,'RHM Victor K. Ortiz','Monday - Friday, 8:00 AM - 5:00 PM',14.728791,120.974494,'https://www.google.com/maps/search/Lawa+Health+Center+Meycauayan/@14.728791,120.974494,17z','["Prenatal Care","Immunization","Family Planning","Senior Citizen Clinic"]'],
  ['hc-020','Caingin Barangay Health Center','healthCenter','Barangay Health Center','Caingin','Brgy. Caingin, Meycauayan City, Bulacan 3020','To be verified',null,'RHM Ponciano A. Delos Santos','Monday - Friday, 8:00 AM - 5:00 PM',14.723707,120.971452,'https://www.google.com/maps/search/Caingin+Health+Center+Meycauayan/@14.723707,120.971452,17z','["Prenatal Care","Immunization","Family Planning","Nutrition Program"]'],
  ['hc-021','Tugatog Barangay Health Center','healthCenter','Barangay Health Center','Tugatog','Brgy. Tugatog, Meycauayan City, Bulacan 3020','To be verified',null,'RHM Natividad P. Cabrera','Monday - Friday, 8:00 AM - 5:00 PM',14.726243,120.964767,'https://www.google.com/maps/search/Tugatog+Health+Center+Meycauayan/@14.726243,120.964767,17z','["Prenatal Care","Immunization","Family Planning","Well-baby Clinic"]'],
  ['hc-022','Bahay Pare Barangay Health Center','healthCenter','Barangay Health Center','Bahay Pare','Brgy. Bahay Pare, Meycauayan City, Bulacan 3020','To be verified',null,'RHM Angelito S. Cruz','Monday - Friday, 8:00 AM - 5:00 PM',14.769528,121.013804,'https://www.google.com/maps/search/Bahay+Pare+Health+Center+Meycauayan/@14.769528,121.013804,17z','["Prenatal Care","Immunization","Family Planning"]'],
  ['hc-023','Longos Barangay Health Center','healthCenter','Barangay Health Center','Longos','Brgy. Longos, Meycauayan City, Bulacan 3020','To be verified',null,'RHM Jaime R. Aquino','Monday - Friday, 8:00 AM - 5:00 PM',14.736739,120.948093,'https://www.google.com/maps/search/Longos+Health+Center+Meycauayan/@14.736739,120.948093,17z','["Prenatal Care","Immunization","Well-baby Clinic"]'],
  ['hc-024','Ubihan Barangay Health Center','healthCenter','Barangay Health Center','Ubihan','Brgy. Ubihan, Meycauayan City, Bulacan 3020','To be verified',null,'RHM Francisco M. Soriano','Monday - Friday, 8:00 AM - 5:00 PM',14.756419,120.919069,'https://www.google.com/maps/search/Ubihan+Health+Center+Meycauayan/@14.756419,120.919069,17z','["Prenatal Care","Immunization","Family Planning"]'],
  ['hc-025','Zamora Barangay Health Center','healthCenter','Barangay Health Center','Zamora','Brgy. Zamora, Meycauayan City, Bulacan 3020','To be verified',null,'RHM Teresa B. Navarro','Monday - Friday, 8:00 AM - 5:00 PM',14.736700,120.955121,'https://www.google.com/maps/search/Zamora+Health+Center+Meycauayan/@14.736700,120.955121,17z','["Prenatal Care","Immunization","Dental Health"]'],
];

$stmt = $pdo->prepare("
    INSERT IGNORE INTO facilities
      (id, name, type, subtype, barangay, address, contact, emergency_hotline,
       person_in_charge, operating_hours, lat, lng, google_maps_url, services)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
");

$inserted = 0;
foreach ($facilities as $f) {
    $stmt->execute($f);
    $inserted += $stmt->rowCount();
}
$log[] = "Facilities: inserted $inserted rows";

// ---------------------------------------------------------------
// BARANGAYS (basic info — GeoJSON is loaded from JS file on map)
// ---------------------------------------------------------------
$barangays = [
  ['Bagbaguin',    "To be verified with City Hall",       12500, '2.1 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Bancal',       "To be verified with City Hall",   14200, '3.2 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Banga',        "To be verified with City Hall",     10800, '1.8 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Bayugo',       "To be verified with City Hall",    8900,  '2.4 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Calvario',     "To be verified with City Hall",     15600, '2.9 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Camalig',      "To be verified with City Hall",   18200, '3.7 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Hulo',         "To be verified with City Hall",      11400, '1.6 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Langka',       "To be verified with City Hall",       9700,  '2.2 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Libtong',      "To be verified with City Hall",      13100, '2.8 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Liputan',      "To be verified with City Hall",   7800,  '1.4 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Malhacan',     "To be verified with City Hall",     22400, '4.1 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Pajo',         "To be verified with City Hall",   8200,  '1.9 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Pandayan',     "To be verified with City Hall",       25600, '4.8 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Pantoc',       "To be verified with City Hall",  6900,  '1.3 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Perez',        "To be verified with City Hall",      16800, '3.4 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Poblacion',    "To be verified with City Hall",     19500, '3.9 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Saluysoy',     "To be verified with City Hall",    11200, '2.6 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Gasak',        "To be verified with City Hall",        14700, '3.1 km²', 'Meycauayan City, Bulacan 3020', null],
  ['Iba',          "To be verified with City Hall",     13400, '2.7 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Lawa',         "To be verified with City Hall",    9800,  '2.0 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Caingin',      "To be verified with City Hall",17300,'3.5 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Tugatog',      "To be verified with City Hall",  12100, '2.3 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Bahay Pare',   "To be verified with City Hall",  15400, '1.2 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Longos',       "To be verified with City Hall",   11200, '0.9 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Ubihan',       "To be verified with City Hall",8900,'0.85 km²', 'Meycauayan City, Bulacan 3020', null],
  ['Zamora',       "To be verified with City Hall",  9800, '0.95 km²', 'Meycauayan City, Bulacan 3020', null],
];

$stmtB = $pdo->prepare("
    INSERT IGNORE INTO barangays (name, captain, population, area, address, description)
    VALUES (?,?,?,?,?,?)
");
$insertedB = 0;
foreach ($barangays as $b) {
    $stmtB->execute($b);
    $insertedB += $stmtB->rowCount();
}
$log[] = "Barangays: inserted $insertedB rows";

// Import GeoJSON boundaries
$geojsonPath = __DIR__ . '/meycauayan-barangays.geojson';
if (!file_exists($geojsonPath)) {
    $geojsonPath = dirname(__DIR__) . '/meycauayan-barangays.geojson';
}

if (file_exists($geojsonPath)) {
    $rawGeoJSON = file_get_contents($geojsonPath);
    $geojson = json_decode($rawGeoJSON, true);
    if ($geojson && isset($geojson['features'])) {
        $stmtG = $pdo->prepare("UPDATE barangays SET geojson = ? WHERE name = ?");
        $updatedG = 0;
        foreach ($geojson['features'] as $feature) {
            $gName = $feature['properties']['barangay'] ?? null;
            if ($gName) {
                $stmtG->execute([json_encode($feature), trim($gName)]);
                if ($stmtG->rowCount() > 0) {
                    $updatedG++;
                }
            }
        }
        $log[] = "Barangay boundaries: updated $updatedG GeoJSON boundaries from file";
    } else {
        $log[] = "Barangay boundaries: failed to parse GeoJSON file";
    }
} else {
    $log[] = "Barangay boundaries: GeoJSON file not found";
}

// Done
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Seed — Meycauayan GIS</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 700px; margin: 60px auto; padding: 20px; }
    h1   { color: #cc0000; }
    .ok  { background: #e8f5e9; border-left: 4px solid #15803d; padding: 10px 16px; margin: 8px 0; border-radius: 4px; }
    .warn{ background: #fff3e0; border-left: 4px solid #e65100; padding: 10px 16px; margin: 8px 0; border-radius: 4px; }
    a    { color: #cc0000; }
  </style>
</head>
<body>
  <h1>Meycauayan GIS — Database Seed</h1>
  <?php foreach ($log as $l): ?>
    <div class="ok">✔ <?= htmlspecialchars($l) ?></div>
  <?php endforeach; ?>
  <div class="warn">
    <strong>Important:</strong> Delete or rename this file after seeding to prevent accidental re-runs.<br>
    <code>C:\xampp\htdocs\kevin\database\seed.php</code>
  </div>
  <p>
    <a href="http://localhost/kevin/">→ Open the portal</a> &nbsp;|&nbsp;
    <a href="http://localhost/kevin/admin.html">→ Open Admin Panel</a>
  </p>
</body>
</html>
