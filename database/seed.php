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

$log = [];

// ---------------------------------------------------------------
// FACILITIES
// ---------------------------------------------------------------
$facilities = [
  // POLICE
  ['pol-001','Meycauayan City Police Station','police','Main Station','Pandayan','Brgy. Pandayan, Meycauayan City, Bulacan 3020','(044) 840-0001 / (044) 228-2777','117','PCol. Jose R. Dela Torre','24 Hours / 7 Days a Week',14.7265,120.9630,'https://www.google.com/maps/search/Meycauayan+City+Police+Station/@14.7265,120.9630,17z',null],
  ['pol-002','Police Community Precinct 1','police','Community Precinct','Calvario','Brgy. Calvario, Meycauayan City, Bulacan 3020','(044) 840-0002','117','PSI. Ricardo M. Santos','24 Hours / 7 Days a Week',14.7300,120.9420,'https://www.google.com/maps/search/Police+Community+Precinct+Calvario+Meycauayan/@14.7300,120.9420,17z',null],
  ['pol-003','Police Community Precinct 2','police','Community Precinct','Bagbaguin','Brgy. Bagbaguin, Meycauayan City, Bulacan 3020','(044) 840-0003','117','PSI. Alicia V. Mendoza','24 Hours / 7 Days a Week',14.7412,120.9421,'https://www.google.com/maps/search/Police+Community+Precinct+Bagbaguin+Meycauayan/@14.7412,120.9421,17z',null],
  ['pol-004','Police Community Precinct 3','police','Community Precinct','Pandayan','Brgy. Pandayan, Meycauayan City, Bulacan 3020','(044) 840-0004','117','PSI. Eduardo F. Cruz','24 Hours / 7 Days a Week',14.7171,120.9543,'https://www.google.com/maps/search/Police+Community+Precinct+Pandayan+Meycauayan/@14.7171,120.9543,17z',null],
  ['pol-005','Police Community Precinct 4','police','Community Precinct','Poblacion','Brgy. Poblacion, Meycauayan City, Bulacan 3020','(044) 840-0005','117','PSI. Gloria N. Pascual','24 Hours / 7 Days a Week',14.7050,120.9802,'https://www.google.com/maps/search/Police+Community+Precinct+Poblacion+Meycauayan/@14.7050,120.9802,17z',null],
  // FIRE
  ['fire-001','Meycauayan City Fire Station','fire','Main Fire Station','Malhacan','Brgy. Malhacan, Meycauayan City, Bulacan 3020','(044) 840-2001 / (044) 228-3000','160','SFO4 Manuel A. Reyes','24 Hours / 7 Days a Week',14.7258,120.9615,'https://www.google.com/maps/search/Meycauayan+City+Fire+Station/@14.7258,120.9615,17z',null],
  ['fire-002','BFP Sub-Station (Northern District)','fire','Sub-Station','Camalig','Brgy. Camalig, Meycauayan City, Bulacan 3020','(044) 840-2002','160','FO3 Lito C. Fernandez','24 Hours / 7 Days a Week',14.7490,120.9540,'https://www.google.com/maps/search/BFP+Sub+Station+Camalig+Meycauayan/@14.7490,120.9540,17z',null],
  // HOSPITALS
  ['hosp-001','Meycauayan District Hospital','hospital','Government Hospital','Perez','Brgy. Perez, Meycauayan City, Bulacan 3020','(044) 840-3001 / (044) 228-0001','(044) 840-3001 loc. 100','Dr. Ana Maria L. Santos, MD','24 Hours / 7 Days a Week',14.7180,120.9668,'https://www.google.com/maps/search/Meycauayan+District+Hospital/@14.7180,120.9668,17z','["Emergency","Maternity","Surgery","Pediatrics","Internal Medicine"]'],
  ['hosp-002','St. Francis Medical Center - Meycauayan','hospital','Private Hospital','Pandayan','Brgy. Pandayan, Meycauayan City, Bulacan 3020','(044) 840-3002 / (044) 228-4444','(044) 840-3002 loc. 0','Dr. Carlos T. Mendoza, MD','24 Hours / 7 Days a Week',14.7192,120.9572,'https://www.google.com/maps/search/St+Francis+Medical+Center+Meycauayan/@14.7192,120.9572,17z','["Emergency","Surgery","OB-Gyne","Pediatrics","Cardiology"]'],
  ['hosp-003','Meycauayan Medical Center','hospital','Private Hospital','Camalig','Brgy. Camalig, Meycauayan City, Bulacan 3020','(044) 840-3003','(044) 840-3003 loc. 9','Dr. Helen R. Garcia, MD','24 Hours / 7 Days a Week',14.7321,120.9530,'https://www.google.com/maps/search/Meycauayan+Medical+Center/@14.7321,120.9530,17z','["Emergency","Surgery","Internal Medicine","Diagnostics"]'],
  // HEALTH CENTERS
  ['hc-001','Bagbaguin Barangay Health Center','healthCenter','Barangay Health Center','Bagbaguin','Brgy. Bagbaguin, Meycauayan City, Bulacan 3020','(044) 840-4001',null,'RHM Josefina M. Santos','Monday - Friday, 8:00 AM - 5:00 PM',14.7420,120.9420,'https://www.google.com/maps/search/Bagbaguin+Health+Center+Meycauayan/@14.7420,120.9420,17z','["Prenatal Care","Immunization","Family Planning","Maternal Health"]'],
  ['hc-002','Bancal Barangay Health Center','healthCenter','Barangay Health Center','Bancal','Brgy. Bancal, Meycauayan City, Bulacan 3020','(044) 840-4002',null,'RHM Maria C. Dela Cruz','Monday - Friday, 8:00 AM - 5:00 PM',14.7530,120.9550,'https://www.google.com/maps/search/Bancal+Health+Center+Meycauayan/@14.7530,120.9550,17z','["Prenatal Care","Immunization","Family Planning","Well-baby Clinic"]'],
  ['hc-003','Banga Barangay Health Center','healthCenter','Barangay Health Center','Banga','Brgy. Banga, Meycauayan City, Bulacan 3020','(044) 840-4003',null,'RHM Cynthia O. Reyes','Monday - Friday, 8:00 AM - 5:00 PM',14.7300,120.9800,'https://www.google.com/maps/search/Banga+Health+Center+Meycauayan/@14.7300,120.9800,17z','["Prenatal Care","Immunization","TB DOTS","Family Planning"]'],
  ['hc-004','Bayugo Barangay Health Center','healthCenter','Barangay Health Center','Bayugo','Brgy. Bayugo, Meycauayan City, Bulacan 3020','(044) 840-4004',null,'RHM Eduardo V. Villanueva','Monday - Friday, 8:00 AM - 5:00 PM',14.7540,120.9670,'https://www.google.com/maps/search/Bayugo+Health+Center+Meycauayan/@14.7540,120.9670,17z','["Prenatal Care","Immunization","Senior Citizen Clinic"]'],
  ['hc-005','Calvario Barangay Health Center','healthCenter','Barangay Health Center','Calvario','Brgy. Calvario, Meycauayan City, Bulacan 3020','(044) 840-4005',null,'RHM Jose L. Mendoza','Monday - Friday, 8:00 AM - 5:00 PM',14.7295,120.9420,'https://www.google.com/maps/search/Calvario+Health+Center+Meycauayan/@14.7295,120.9420,17z','["Prenatal Care","Immunization","Family Planning","Dental Health"]'],
  ['hc-006','Camalig Barangay Health Center','healthCenter','Barangay Health Center','Camalig','Brgy. Camalig, Meycauayan City, Bulacan 3020','(044) 840-4006',null,'RHM Leonora A. Garcia','Monday - Friday, 8:00 AM - 5:00 PM',14.7400,120.9553,'https://www.google.com/maps/search/Camalig+Health+Center+Meycauayan/@14.7400,120.9553,17z','["Prenatal Care","Immunization","Well-baby Clinic","Nutrition Program"]'],
  ['hc-007','Hulo Barangay Health Center','healthCenter','Barangay Health Center','Hulo','Brgy. Hulo, Meycauayan City, Bulacan 3020','(044) 840-4007',null,'RHM Arnaldo B. Pascual','Monday - Friday, 8:00 AM - 5:00 PM',14.7171,120.9420,'https://www.google.com/maps/search/Hulo+Health+Center+Meycauayan/@14.7171,120.9420,17z','["Prenatal Care","Immunization","Family Planning","TB DOTS"]'],
  ['hc-008','Langka Barangay Health Center','healthCenter','Barangay Health Center','Langka','Brgy. Langka, Meycauayan City, Bulacan 3020','(044) 840-4008',null,'RHM Florencia G. Aquino','Monday - Friday, 8:00 AM - 5:00 PM',14.7540,120.9420,'https://www.google.com/maps/search/Langka+Health+Center+Meycauayan/@14.7540,120.9420,17z','["Prenatal Care","Immunization","Senior Citizen Clinic","Family Planning"]'],
  ['hc-009','Libtong Barangay Health Center','healthCenter','Barangay Health Center','Libtong','Brgy. Libtong, Meycauayan City, Bulacan 3020','(044) 840-4009',null,'RHM Richard A. Torres','Monday - Friday, 8:00 AM - 5:00 PM',14.7400,120.9680,'https://www.google.com/maps/search/Libtong+Health+Center+Meycauayan/@14.7400,120.9680,17z','["Prenatal Care","Immunization","Family Planning","Dental Health"]'],
  ['hc-010','Liputan Barangay Health Center','healthCenter','Barangay Health Center','Liputan','Brgy. Liputan, Meycauayan City, Bulacan 3020','(044) 840-4010',null,'RHM Angelica P. Gutierrez','Monday - Friday, 8:00 AM - 5:00 PM',14.7062,120.9670,'https://www.google.com/maps/search/Liputan+Health+Center+Meycauayan/@14.7062,120.9670,17z','["Prenatal Care","Immunization","Well-baby Clinic"]'],
  ['hc-011','Malhacan Barangay Health Center','healthCenter','Barangay Health Center','Malhacan','Brgy. Malhacan, Meycauayan City, Bulacan 3020','(044) 840-4011',null,'RHM Benjamin O. Soriano','Monday - Friday, 8:00 AM - 5:00 PM',14.7290,120.9610,'https://www.google.com/maps/search/Malhacan+Health+Center+Meycauayan/@14.7290,120.9610,17z','["Prenatal Care","Immunization","Family Planning","TB DOTS","Nutrition Program"]'],
  ['hc-012','Pajo Barangay Health Center','healthCenter','Barangay Health Center','Pajo','Brgy. Pajo, Meycauayan City, Bulacan 3020','(044) 840-4012',null,'RHM Teresita H. Navarro','Monday - Friday, 8:00 AM - 5:00 PM',14.7061,120.9480,'https://www.google.com/maps/search/Pajo+Health+Center+Meycauayan/@14.7061,120.9480,17z','["Prenatal Care","Immunization","Senior Citizen Clinic","Family Planning"]'],
  ['hc-013','Pandayan Barangay Health Center','healthCenter','Barangay Health Center','Pandayan','Brgy. Pandayan, Meycauayan City, Bulacan 3020','(044) 840-4013',null,'RHM Alfredo S. Cruz','Monday - Friday, 8:00 AM - 5:00 PM',14.7180,120.9548,'https://www.google.com/maps/search/Pandayan+Health+Center+Meycauayan/@14.7180,120.9548,17z','["Prenatal Care","Immunization","Family Planning","TB DOTS","Dental Health"]'],
  ['hc-014','Perez Barangay Health Center','healthCenter','Barangay Health Center','Perez','Brgy. Perez, Meycauayan City, Bulacan 3020','(044) 840-4014',null,'RHM Maricel T. Reyes','Monday - Friday, 8:00 AM - 5:00 PM',14.7181,120.9672,'https://www.google.com/maps/search/Perez+Health+Center+Meycauayan/@14.7181,120.9672,17z','["Prenatal Care","Immunization","Family Planning","Well-baby Clinic"]'],
  ['hc-015','Poblacion Barangay Health Center','healthCenter','Barangay Health Center','Poblacion','Brgy. Poblacion, Meycauayan City, Bulacan 3020','(044) 840-4015',null,'RHM Gregorio F. Lim','Monday - Friday, 8:00 AM - 5:00 PM',14.7062,120.9802,'https://www.google.com/maps/search/Poblacion+Health+Center+Meycauayan/@14.7062,120.9802,17z','["Prenatal Care","Immunization","Family Planning","Senior Citizen Clinic"]'],
  ['hc-016','Saluysoy Barangay Health Center','healthCenter','Barangay Health Center','Saluysoy','Brgy. Saluysoy, Meycauayan City, Bulacan 3020','(044) 840-4016',null,'RHM Lourdes M. Bautista','Monday - Friday, 8:00 AM - 5:00 PM',14.6940,120.9480,'https://www.google.com/maps/search/Saluysoy+Health+Center+Meycauayan/@14.6940,120.9480,17z','["Prenatal Care","Immunization","Family Planning","Nutrition Program"]'],
  ['hc-017','San Francisco Barangay Health Center','healthCenter','Barangay Health Center','San Francisco','Brgy. San Francisco, Meycauayan City, Bulacan 3020','(044) 840-4017',null,'RHM Dennis B. Abad','Monday - Friday, 8:00 AM - 5:00 PM',14.7420,120.9800,'https://www.google.com/maps/search/San+Francisco+Health+Center+Meycauayan/@14.7420,120.9800,17z','["Prenatal Care","Immunization","Well-baby Clinic","Family Planning"]'],
  ['hc-018','San Jose Barangay Health Center','healthCenter','Barangay Health Center','San Jose','Brgy. San Jose, Meycauayan City, Bulacan 3020','(044) 840-4018',null,'RHM Carmelita G. Felipe','Monday - Friday, 8:00 AM - 5:00 PM',14.7300,120.9930,'https://www.google.com/maps/search/San+Jose+Health+Center+Meycauayan/@14.7300,120.9930,17z','["Prenatal Care","Immunization","Family Planning","TB DOTS"]'],
  ['hc-019','San Juan Barangay Health Center','healthCenter','Barangay Health Center','San Juan','Brgy. San Juan, Meycauayan City, Bulacan 3020','(044) 840-4019',null,'RHM Victor K. Ortiz','Monday - Friday, 8:00 AM - 5:00 PM',14.7181,120.9802,'https://www.google.com/maps/search/San+Juan+Health+Center+Meycauayan/@14.7181,120.9802,17z','["Prenatal Care","Immunization","Family Planning","Senior Citizen Clinic"]'],
  ['hc-020','Santa Maria Barangay Health Center','healthCenter','Barangay Health Center','Santa Maria','Brgy. Santa Maria, Meycauayan City, Bulacan 3020','(044) 840-4020',null,'RHM Ponciano A. Delos Santos','Monday - Friday, 8:00 AM - 5:00 PM',14.7530,120.9802,'https://www.google.com/maps/search/Santa+Maria+Health+Center+Meycauayan/@14.7530,120.9802,17z','["Prenatal Care","Immunization","Family Planning","Nutrition Program"]'],
  ['hc-021','Tugatog Barangay Health Center','healthCenter','Barangay Health Center','Tugatog','Brgy. Tugatog, Meycauayan City, Bulacan 3020','(044) 840-4021',null,'RHM Natividad P. Cabrera','Monday - Friday, 8:00 AM - 5:00 PM',14.7062,120.9930,'https://www.google.com/maps/search/Tugatog+Health+Center+Meycauayan/@14.7062,120.9930,17z','["Prenatal Care","Immunization","Family Planning","Well-baby Clinic"]'],
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
  ['Bagbaguin',    'Hon. Jose Santos',       12500, '2.1 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Bancal',       'Hon. Maria Dela Cruz',   14200, '3.2 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Banga',        'Hon. Roberto Reyes',     10800, '1.8 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Bayugo',       'Hon. Antonio Garcia',    8900,  '2.4 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Calvario',     'Hon. Carmen Santos',     15600, '2.9 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Camalig',      'Hon. Eduardo Mendoza',   18200, '3.7 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Hulo',         'Hon. Rosa Pascual',      11400, '1.6 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Langka',       'Hon. Juan Aquino',       9700,  '2.2 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Libtong',      'Hon. Lucia Torres',      13100, '2.8 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Liputan',      'Hon. Pedro Gutierrez',   7800,  '1.4 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Malhacan',     'Hon. Sofia Soriano',     22400, '4.1 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Pajo',         'Hon. Ricardo Navarro',   8200,  '1.9 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Pandayan',     'Hon. Alicia Cruz',       25600, '4.8 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Pantoc',       'Hon. Marco Villanueva',  6900,  '1.3 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Perez',        'Hon. Diana Santos',      16800, '3.4 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Poblacion',    'Hon. Carlos Felipe',     19500, '3.9 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Saluysoy',     'Hon. Elena Bautista',    11200, '2.6 km²',  'Meycauayan City, Bulacan 3020', null],
  ['San Francisco','Hon. Miguel Abad',        14700, '3.1 km²', 'Meycauayan City, Bulacan 3020', null],
  ['San Jose',     'Hon. Teresa Felipe',     13400, '2.7 km²',  'Meycauayan City, Bulacan 3020', null],
  ['San Juan',     'Hon. Fernando Ortiz',    9800,  '2.0 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Santa Maria',  'Hon. Amelia Delos Santos',17300,'3.5 km²',  'Meycauayan City, Bulacan 3020', null],
  ['Tugatog',      'Hon. Bernardo Cabrera',  12100, '2.3 km²',  'Meycauayan City, Bulacan 3020', null],
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
