<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$config = require __DIR__ . '/config.php';

function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function ok($data): void
{
    respond(200, ['ok' => true, 'data' => $data]);
}

function fail(string $message, int $status = 400): void
{
    respond($status, ['ok' => false, 'error' => $message]);
}

function read_json(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }

    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function pdo_conn(array $config): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        $config['db_host'],
        $config['db_port'],
        $config['db_name']
    );

    $pdo = new PDO($dsn, $config['db_user'], $config['db_password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    return $pdo;
}

function base64url_encode(string $value): string
{
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function base64url_decode(string $value): string
{
    $padding = strlen($value) % 4;
    if ($padding > 0) {
        $value .= str_repeat('=', 4 - $padding);
    }
    return base64_decode(strtr($value, '-_', '+/')) ?: '';
}

function create_token(array $payload, string $secret): string
{
    $encoded = base64url_encode(json_encode($payload));
    $signature = base64url_encode(hash_hmac('sha256', $encoded, $secret, true));
    return $encoded . '.' . $signature;
}

function verify_token(string $token, string $secret): ?array
{
    $parts = explode('.', $token);
    if (count($parts) !== 2) {
      return null;
    }

    [$encoded, $signature] = $parts;
    $expected = base64url_encode(hash_hmac('sha256', $encoded, $secret, true));
    if (!hash_equals($expected, $signature)) {
        return null;
    }

    $payload = json_decode(base64url_decode($encoded), true);
    if (!is_array($payload)) {
        return null;
    }

    if (($payload['exp'] ?? 0) < time()) {
        return null;
    }

    return $payload;
}

function bearer_token(): ?string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!$header && function_exists('getallheaders')) {
        $headers = getallheaders();
        $header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }

    if (!preg_match('/Bearer\s+(.+)/i', $header, $matches)) {
        return null;
    }

    return trim($matches[1]);
}

function random_salt(int $length = 12): string
{
    return substr(bin2hex(random_bytes($length)), 0, $length);
}

function django_hash_password(string $password, int $iterations = 720000): string
{
    $salt = random_salt();
    $hash = base64_encode(hash_pbkdf2('sha256', $password, $salt, $iterations, 32, true));
    return sprintf('pbkdf2_sha256$%d$%s$%s', $iterations, $salt, $hash);
}

function verify_django_password(string $password, string $stored): bool
{
    $parts = explode('$', $stored);
    if (count($parts) !== 4 || $parts[0] !== 'pbkdf2_sha256') {
        return false;
    }

    [, $iterations, $salt, $hash] = $parts;
    $computed = base64_encode(hash_pbkdf2('sha256', $password, $salt, (int)$iterations, 32, true));
    return hash_equals($hash, $computed);
}

function media_url(string $path, array $config): string
{
    if ($path === '') {
        return '';
    }

    if (preg_match('/^https?:\/\//i', $path)) {
        return $path;
    }

    $base = $config['media_base_url'] ?? '';
    if ($base === '') {
        return $path;
    }

    return $base . '/' . ltrim($path, '/');
}

function split_name(string $fullName): array
{
    $parts = preg_split('/\s+/', trim($fullName)) ?: [];
    $first = $parts[0] ?? '';
    $last = count($parts) > 1 ? implode(' ', array_slice($parts, 1)) : '';
    return [$first, $last];
}

function fetch_user(PDO $pdo, int $userId): ?array
{
    $stmt = $pdo->prepare("
        SELECT
            u.id,
            u.email,
            CONCAT(TRIM(COALESCE(u.first_name, '')), CASE WHEN COALESCE(u.last_name, '') <> '' THEN ' ' ELSE '' END, TRIM(COALESCE(u.last_name, ''))) AS full_name,
            u.is_staff,
            p.mobile
        FROM auth_user u
        LEFT JOIN user_profile p ON p.user_id = u.id
        WHERE u.id = :id
        LIMIT 1
    ");
    $stmt->execute(['id' => $userId]);
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }

    return [
        'uid' => (string)$row['id'],
        'email' => (string)$row['email'],
        'fullName' => trim((string)$row['full_name']) !== '' ? trim((string)$row['full_name']) : (string)$row['email'],
        'phone' => $row['mobile'],
        'isStaff' => (bool)$row['is_staff'],
    ];
}

function require_auth(PDO $pdo, array $config): array
{
    $token = bearer_token();
    if (!$token) {
        fail('Authentication required', 401);
    }

    $payload = verify_token($token, $config['token_secret']);
    if (!$payload || !isset($payload['uid'])) {
        fail('Invalid token', 401);
    }

    $user = fetch_user($pdo, (int)$payload['uid']);
    if (!$user) {
        fail('User not found', 401);
    }

    return $user;
}

function course_row_to_api(array $row, array $config): array
{
    $price = isset($row['price']) ? (int)$row['price'] : 0;
    return [
        'id' => (string)$row['id'],
        'categoryName' => $row['category_name'] ?: 'Uncategorized',
        'courseName' => $row['course_name'],
        'subCourseName' => $row['instructor'],
        'description' => $row['description'],
        'detailedDescription' => $row['category_description'] ?: $row['description'],
        'language' => $row['language'],
        'contentType' => $row['content_type'],
        'isPaid' => $price > 0,
        'price' => $price,
        'priceMonth' => isset($row['price_month']) ? (int)$row['price_month'] : null,
        'isActive' => true,
        'sortOrder' => (int)$row['id'],
        'instructor' => $row['instructor'],
        'imageUrl' => media_url((string)($row['course_image'] ?? ''), $config),
        'demoVideoUrl' => media_url((string)($row['demo_video'] ?? ''), $config),
        'validateFor' => isset($row['validate_for']) ? (int)$row['validate_for'] : null,
    ];
}

function fetch_courses(PDO $pdo, array $config, ?int $courseId = null): array
{
    $sql = "
        SELECT
            c.id,
            c.name AS course_name,
            c.description,
            c.course_lang AS language,
            c.type AS content_type,
            c.instructor,
            c.course_image,
            c.demo_video,
            c.validate_for,
            cm.name AS category_name,
            cm.description AS category_description,
            mm.money AS price,
            mm.month AS price_month
        FROM courses_course c
        LEFT JOIN courses_coursemaster cm ON cm.id = c.course_master_id
        LEFT JOIN (
            SELECT t.course_id, t.money, t.month
            FROM courses_monthmoney t
            INNER JOIN (
                SELECT course_id, MIN(money) AS min_money
                FROM courses_monthmoney
                GROUP BY course_id
            ) x ON x.course_id = t.course_id AND x.min_money = t.money
        ) mm ON mm.course_id = c.id
    ";

    if ($courseId !== null) {
        $sql .= " WHERE c.id = :courseId";
    }

    $sql .= " ORDER BY c.id DESC";
    $stmt = $pdo->prepare($sql);
    if ($courseId !== null) {
        $stmt->execute(['courseId' => $courseId]);
    } else {
        $stmt->execute();
    }

    $rows = $stmt->fetchAll();
    return array_map(fn($row) => course_row_to_api($row, $config), $rows);
}

function fetch_my_courses(PDO $pdo, array $config, int $userId): array
{
    $stmt = $pdo->prepare("
        SELECT
            cp.id AS purchase_id,
            cp.course_id,
            COALESCE(cp.payment_status, 'active') AS payment_status,
            cp.start_date,
            c.id,
            c.name AS course_name,
            c.description,
            c.course_lang AS language,
            c.type AS content_type,
            c.instructor,
            c.course_image,
            c.demo_video,
            c.validate_for,
            cm.name AS category_name,
            cm.description AS category_description,
            mm.money AS price,
            mm.month AS price_month
        FROM courses_coursepurchased cp
        INNER JOIN courses_course c ON c.id = cp.course_id
        LEFT JOIN courses_coursemaster cm ON cm.id = c.course_master_id
        LEFT JOIN (
            SELECT t.course_id, t.money, t.month
            FROM courses_monthmoney t
            INNER JOIN (
                SELECT course_id, MIN(money) AS min_money
                FROM courses_monthmoney
                GROUP BY course_id
            ) x ON x.course_id = t.course_id AND x.min_money = t.money
        ) mm ON mm.course_id = c.id
        WHERE cp.user_id = :userId
        ORDER BY cp.start_date DESC, cp.id DESC
    ");
    $stmt->execute(['userId' => $userId]);
    $rows = $stmt->fetchAll();

    $deduped = [];
    foreach ($rows as $row) {
        $courseId = (string)$row['course_id'];
        if (!isset($deduped[$courseId])) {
            $deduped[$courseId] = $row;
        }
    }

    if (!$deduped) {
        return [];
    }

    $courseIds = array_map('intval', array_keys($deduped));
    $in = implode(',', array_fill(0, count($courseIds), '?'));

    $sessionStmt = $pdo->prepare("SELECT course_id, COUNT(*) AS total_sessions FROM courses_videofiles WHERE course_id IN ($in) GROUP BY course_id");
    $sessionStmt->execute($courseIds);
    $sessionCounts = [];
    foreach ($sessionStmt->fetchAll() as $row) {
        $sessionCounts[(string)$row['course_id']] = (int)$row['total_sessions'];
    }

    $watchSql = "
        SELECT course_id,
               SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_sessions
        FROM courses_userwatch
        WHERE user_id = ? AND course_id IN ($in)
        GROUP BY course_id
    ";
    $watchStmt = $pdo->prepare($watchSql);
    $watchStmt->execute(array_merge([$userId], $courseIds));
    $watchCounts = [];
    foreach ($watchStmt->fetchAll() as $row) {
        $watchCounts[(string)$row['course_id']] = (int)$row['completed_sessions'];
    }

    $result = [];
    foreach ($deduped as $courseId => $row) {
        $course = course_row_to_api($row, $config);
        $course['paymentStatus'] = $row['payment_status'];
        $course['enrolledAt'] = $row['start_date'];
        $course['totalSessions'] = $sessionCounts[$courseId] ?? 0;
        $course['completedSessions'] = $watchCounts[$courseId] ?? 0;
        $course['sessionProgress'] = new stdClass();
        $result[] = $course;
    }

    return $result;
}

try {
    $pdo = pdo_conn($config);
    $action = $_GET['action'] ?? '';

    switch ($action) {
        case 'courses':
            ok(fetch_courses($pdo, $config));
            break;

        case 'course':
            $id = (int)($_GET['id'] ?? 0);
            if ($id <= 0) {
                fail('Invalid course id');
            }
            $rows = fetch_courses($pdo, $config, $id);
            if (!$rows) {
                fail('Course not found', 404);
            }
            ok($rows[0]);
            break;

        case 'sessions':
            $courseId = (int)($_GET['courseId'] ?? 0);
            if ($courseId <= 0) {
                fail('Invalid course id');
            }
            $stmt = $pdo->prepare("
                SELECT id, course_id, title, file, day, round_view, code_no
                FROM courses_videofiles
                WHERE course_id = :courseId
                ORDER BY COALESCE(code_no, day, id), id
            ");
            $stmt->execute(['courseId' => $courseId]);
            $rows = array_map(function ($row) use ($config) {
                return [
                    'id' => (string)$row['id'],
                    'courseId' => (string)$row['course_id'],
                    'title' => $row['title'] ?: ('Session ' . $row['id']),
                    'description' => null,
                    'audioUrl' => media_url((string)$row['file'], $config),
                    'duration' => (int)($row['round_view'] ?: 600),
                    'order' => (int)($row['code_no'] ?: ($row['day'] ?: $row['id'])),
                    'isActive' => true,
                ];
            }, $stmt->fetchAll());
            ok($rows);
            break;

        case 'login':
            $body = read_json();
            $email = strtolower(trim((string)($body['email'] ?? '')));
            $password = (string)($body['password'] ?? '');
            if ($email === '' || $password === '') {
                fail('Email and password are required');
            }

            $stmt = $pdo->prepare("SELECT * FROM auth_user WHERE LOWER(email) = :email LIMIT 1");
            $stmt->execute(['email' => $email]);
            $dbUser = $stmt->fetch();
            if (!$dbUser || !verify_django_password($password, (string)$dbUser['password'])) {
                fail('Invalid email or password', 401);
            }

            $user = fetch_user($pdo, (int)$dbUser['id']);
            if (!$user) {
                fail('User not found', 404);
            }

            $token = create_token([
                'uid' => (int)$dbUser['id'],
                'email' => $user['email'],
                'exp' => time() + (60 * 60 * 24 * 30),
            ], $config['token_secret']);

            ok(['token' => $token, 'user' => $user]);
            break;

        case 'register':
            $body = read_json();
            $email = strtolower(trim((string)($body['email'] ?? '')));
            $password = (string)($body['password'] ?? '');
            $fullName = trim((string)($body['fullName'] ?? ''));
            $phone = trim((string)($body['phone'] ?? ''));
            if ($email === '' || $password === '' || $fullName === '') {
                fail('Full name, email and password are required');
            }

            $stmt = $pdo->prepare("SELECT id FROM auth_user WHERE LOWER(email) = :email LIMIT 1");
            $stmt->execute(['email' => $email]);
            if ($stmt->fetch()) {
                fail('Email already exists', 409);
            }

            [$firstName, $lastName] = split_name($fullName);
            $hash = django_hash_password($password);

            $stmt = $pdo->prepare("
                INSERT INTO auth_user
                (password, last_login, is_superuser, username, first_name, last_name, email, is_staff, is_active, date_joined)
                VALUES (:password, NULL, 0, :username, :first_name, :last_name, :email, 0, 1, NOW())
            ");
            $stmt->execute([
                'password' => $hash,
                'username' => $email,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => $email,
            ]);
            $userId = (int)$pdo->lastInsertId();

            $profileStmt = $pdo->prepare("
                INSERT INTO user_profile (mobile, age, user_id, address, created_at, updated_at)
                VALUES (:mobile, NULL, :user_id, NULL, CURDATE(), CURDATE())
            ");
            $profileStmt->execute([
                'mobile' => $phone !== '' ? $phone : null,
                'user_id' => $userId,
            ]);

            $user = fetch_user($pdo, $userId);
            $token = create_token([
                'uid' => $userId,
                'email' => $email,
                'exp' => time() + (60 * 60 * 24 * 30),
            ], $config['token_secret']);

            ok(['token' => $token, 'user' => $user]);
            break;

        case 'me':
            $user = require_auth($pdo, $config);
            ok(['user' => $user]);
            break;

        case 'change-password':
            $authUser = require_auth($pdo, $config);
            $body = read_json();
            $currentPassword = (string)($body['currentPassword'] ?? '');
            $newPassword = (string)($body['newPassword'] ?? '');
            if ($currentPassword === '' || $newPassword === '') {
                fail('Current and new password are required');
            }

            $stmt = $pdo->prepare("SELECT password FROM auth_user WHERE id = :id LIMIT 1");
            $stmt->execute(['id' => (int)$authUser['uid']]);
            $row = $stmt->fetch();
            if (!$row || !verify_django_password($currentPassword, (string)$row['password'])) {
                fail('Current password is incorrect', 401);
            }

            $stmt = $pdo->prepare("UPDATE auth_user SET password = :password WHERE id = :id");
            $stmt->execute([
                'password' => django_hash_password($newPassword),
                'id' => (int)$authUser['uid'],
            ]);

            ok(['changed' => true]);
            break;

        case 'account':
            $authUser = require_auth($pdo, $config);
            $purchaseStmt = $pdo->prepare("
                SELECT
                    cp.id,
                    cp.course_id AS courseId,
                    c.name AS courseName,
                    COALESCE(cp.totalprice, cp.price, 0) AS amount,
                    COALESCE(cp.payment_status, 'pending') AS status,
                    cp.razorpay_payment_id AS paymentId,
                    cp.start_date AS createdAt
                FROM courses_coursepurchased cp
                INNER JOIN courses_course c ON c.id = cp.course_id
                WHERE cp.user_id = :userId
                ORDER BY cp.start_date DESC, cp.id DESC
            ");
            $purchaseStmt->execute(['userId' => (int)$authUser['uid']]);
            $purchases = $purchaseStmt->fetchAll();
            $myCourses = fetch_my_courses($pdo, $config, (int)$authUser['uid']);
            ok([
                'user' => $authUser,
                'purchases' => $purchases,
                'myCourses' => $myCourses,
            ]);
            break;

        case 'my-courses':
            $authUser = require_auth($pdo, $config);
            ok(fetch_my_courses($pdo, $config, (int)$authUser['uid']));
            break;

        case 'enroll':
            $authUser = require_auth($pdo, $config);
            $body = read_json();
            $courseId = (int)($body['courseId'] ?? 0);
            $paymentId = trim((string)($body['paymentId'] ?? ''));
            if ($courseId <= 0) {
                fail('Invalid course');
            }

            $checkStmt = $pdo->prepare("
                SELECT id
                FROM courses_coursepurchased
                WHERE user_id = :userId AND course_id = :courseId
                ORDER BY start_date DESC, id DESC
                LIMIT 1
            ");
            $checkStmt->execute([
                'userId' => (int)$authUser['uid'],
                'courseId' => $courseId,
            ]);
            $existing = $checkStmt->fetch();
            if ($existing) {
                ok(['enrolled' => true, 'paymentStatus' => 'existing']);
            }

            $courseStmt = $pdo->prepare("
                SELECT c.validate_for, mm.money, mm.month
                FROM courses_course c
                LEFT JOIN (
                    SELECT t.course_id, t.money, t.month
                    FROM courses_monthmoney t
                    INNER JOIN (
                        SELECT course_id, MIN(money) AS min_money
                        FROM courses_monthmoney
                        GROUP BY course_id
                    ) x ON x.course_id = t.course_id AND x.min_money = t.money
                ) mm ON mm.course_id = c.id
                WHERE c.id = :courseId
                LIMIT 1
            ");
            $courseStmt->execute(['courseId' => $courseId]);
            $course = $courseStmt->fetch();
            if (!$course) {
                fail('Course not found', 404);
            }

            $months = (int)($course['price_month'] ?? 0);
            if ($months <= 0) {
                $months = (int)($course['month'] ?? 0);
            }
            if ($months <= 0) {
                $months = (int)($course['validate_for'] ?? 1);
            }
            if ($months <= 0) {
                $months = 1;
            }

            $amount = (int)($course['money'] ?? 0);
            $paymentStatus = $paymentId !== '' ? 'paid' : 'free';

            $insertStmt = $pdo->prepare("
                INSERT INTO courses_coursepurchased
                (price, discount, totalprice, quantity, razorpay_payment_id, razorpay_order_id, razorpay_signature, payment_status, start_date, end_date, course_id, user_id, month, coupon_code, mail_delivered, customer_status, access_token, merchant_reference_id)
                VALUES
                (:price, '0', :totalprice, 1, :paymentId, NULL, NULL, :paymentStatus, NOW(), DATE_ADD(NOW(), INTERVAL :months MONTH), :courseId, :userId, :months, '', 0, NULL, NULL, NULL)
            ");
            $insertStmt->bindValue(':price', $amount, PDO::PARAM_INT);
            $insertStmt->bindValue(':totalprice', $amount, PDO::PARAM_INT);
            $insertStmt->bindValue(':paymentId', $paymentId !== '' ? $paymentId : null, $paymentId !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
            $insertStmt->bindValue(':paymentStatus', $paymentStatus, PDO::PARAM_STR);
            $insertStmt->bindValue(':months', $months, PDO::PARAM_INT);
            $insertStmt->bindValue(':courseId', $courseId, PDO::PARAM_INT);
            $insertStmt->bindValue(':userId', (int)$authUser['uid'], PDO::PARAM_INT);
            $insertStmt->execute();

            ok(['enrolled' => true, 'paymentStatus' => $paymentStatus]);
            break;

        case 'session-progress':
            $authUser = require_auth($pdo, $config);
            $body = read_json();
            $courseId = (int)($body['courseId'] ?? 0);
            $sessionId = (int)($body['sessionId'] ?? 0);
            $position = (int)($body['position'] ?? 0);
            $completed = (bool)($body['completed'] ?? false);
            if ($courseId <= 0 || $sessionId <= 0) {
                fail('Invalid progress payload');
            }

            $status = $completed ? 'completed' : 'in_progress';
            $checkStmt = $pdo->prepare("
                SELECT id
                FROM courses_userwatch
                WHERE user_id = :userId AND videofile_id = :videoId
                LIMIT 1
            ");
            $checkStmt->execute([
                'userId' => (int)$authUser['uid'],
                'videoId' => $sessionId,
            ]);
            $existing = $checkStmt->fetch();

            if ($existing) {
                $stmt = $pdo->prepare("
                    UPDATE courses_userwatch
                    SET whatch_count = :count, status = :status, course_id = :courseId
                    WHERE id = :id
                ");
                $stmt->execute([
                    'count' => max($position, 0),
                    'status' => $status,
                    'courseId' => $courseId,
                    'id' => (int)$existing['id'],
                ]);
            } else {
                $stmt = $pdo->prepare("
                    INSERT INTO courses_userwatch (whatch_count, status, course_id, user_id, videofile_id)
                    VALUES (:count, :status, :courseId, :userId, :videoId)
                ");
                $stmt->execute([
                    'count' => max($position, 0),
                    'status' => $status,
                    'courseId' => $courseId,
                    'userId' => (int)$authUser['uid'],
                    'videoId' => $sessionId,
                ]);
            }

            ok(['saved' => true]);
            break;

        default:
            fail('Unknown action', 404);
    }
} catch (Throwable $e) {
    fail($e->getMessage(), 500);
}
