<?php
$file = 'reminders.json';
$data = file_exists($file) ? json_decode(file_get_contents($file), true) : [];
header('Content-Type: application/json');
echo json_encode($data);
?>
