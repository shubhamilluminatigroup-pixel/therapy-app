<?php

return [
    'db_host' => getenv('MRC_DB_HOST') ?: '127.0.0.1',
    'db_port' => getenv('MRC_DB_PORT') ?: '3306',
    'db_name' => getenv('MRC_DB_NAME') ?: 'mrc_college',
    'db_user' => getenv('MRC_DB_USER') ?: '',
    'db_password' => getenv('MRC_DB_PASSWORD') ?: '',
    'token_secret' => getenv('MRC_APP_TOKEN_SECRET') ?: 'change-this-secret',
    'media_base_url' => rtrim(getenv('MRC_MEDIA_BASE_URL') ?: '', '/'),
];
