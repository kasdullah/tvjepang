<?php
// filepath: d:\coding project\program-guide\save.php
header('Content-Type: application/json');

// Ambil data JSON dari body
$data = json_decode(file_get_contents('php://input'), true);

if (!is_array($data)) {
    echo json_encode(['success' => false, 'message' => 'Invalid data']);
    exit;
}

file_put_contents('reminders.json', json_encode($data, JSON_PRETTY_PRINT));
echo json_encode(['success' => true]);
?>
