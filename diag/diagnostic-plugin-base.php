<?php
/*
Plugin Name: Device Diagnostic
Description: Step-by-step device diagnostic with PDF result.
Version: 0.1.0
*/

// Load Composer autoloader if present so Dompdf is available
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require_once __DIR__ . '/vendor/autoload.php';
}

if (!defined('ABSPATH')) {
    exit;
}

function diagnostic_plugin_activate() {
    global $wpdb;
    $table = $wpdb->prefix . 'diagnostic_results';
    $charset = $wpdb->get_charset_collate();
    $sql = "CREATE TABLE IF NOT EXISTS $table (
        id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        result_json LONGTEXT NOT NULL,
        created_at DATETIME NOT NULL,
        PRIMARY KEY (id)
    ) $charset";
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta($sql);
}
register_activation_hook(__FILE__, 'diagnostic_plugin_activate');

function diagnostic_register_menu() {
    add_menu_page(
        'Диагностика',
        'Диагностика',
        'manage_options',
        'diagnostic-settings',
        'diagnostic_settings_page'
    );
    add_submenu_page(
        'diagnostic-settings',
        'Редактор дерева',
        'Редактор дерева',
        'manage_options',
        'diagnostic-tree-editor',
        'diagnostic_tree_editor_page'
    );
}
add_action('admin_menu', 'diagnostic_register_menu');

function diagnostic_settings_page() {
    if (!current_user_can('manage_options')) {
        return;
    }

    if (isset($_POST['diagnostic_save'])) {
        check_admin_referer('diagnostic_save');
        update_option('diagnostic_telegram', sanitize_text_field($_POST['diagnostic_telegram']));
        update_option('diagnostic_viber', sanitize_text_field($_POST['diagnostic_viber']));
        update_option('diagnostic_whatsapp', sanitize_text_field($_POST['diagnostic_whatsapp']));
        update_option('diagnostic_styles', wp_kses_post($_POST['diagnostic_styles']));
        update_option('diagnostic_enable_pdf', isset($_POST['diagnostic_enable_pdf']) ? 1 : 0);
        echo '<div class="updated"><p>Сохранено</p></div>';
    }

    $telegram = esc_attr(get_option('diagnostic_telegram', ''));
    $viber = esc_attr(get_option('diagnostic_viber', ''));
    $whatsapp = esc_attr(get_option('diagnostic_whatsapp', ''));
    $styles = esc_textarea(get_option('diagnostic_styles', ''));
    $enable_pdf = get_option('diagnostic_enable_pdf', 1);

    echo '<div class="wrap">';
    echo '<h1>Настройки диагностики</h1>';
    echo '<form method="post">';
    wp_nonce_field('diagnostic_save');
    echo '<table class="form-table">';
    echo '<tr><th scope="row"><label for="diagnostic_telegram">Ссылка Telegram</label></th>';
    echo '<td><input type="text" id="diagnostic_telegram" name="diagnostic_telegram" value="' . $telegram . '" class="regular-text" /></td></tr>';
    echo '<tr><th scope="row"><label for="diagnostic_viber">Ссылка Viber</label></th>';
    echo '<td><input type="text" id="diagnostic_viber" name="diagnostic_viber" value="' . $viber . '" class="regular-text" /></td></tr>';
    echo '<tr><th scope="row"><label for="diagnostic_whatsapp">Ссылка WhatsApp</label></th>';
    echo '<td><input type="text" id="diagnostic_whatsapp" name="diagnostic_whatsapp" value="' . $whatsapp . '" class="regular-text" /></td></tr>';
    echo '<tr><th scope="row"><label for="diagnostic_styles">JSON стилей</label></th>';
    echo '<td><textarea id="diagnostic_styles" name="diagnostic_styles" rows="5" cols="50">' . $styles . '</textarea></td></tr>';
    echo '<tr><th scope="row"><label for="diagnostic_enable_pdf">Включить PDF</label></th>';
    echo '<td><input type="checkbox" id="diagnostic_enable_pdf" name="diagnostic_enable_pdf" value="1"' . checked(1, $enable_pdf, false) . '/></td></tr>';
    echo '</table>';
    echo '<p><input type="submit" name="diagnostic_save" class="button-primary" value="Сохранить" /></p>';
    echo '</form>';

    global $wpdb;
    $table = $wpdb->prefix . 'diagnostic_results';
    $results = $wpdb->get_results("SELECT created_at, result_json FROM $table ORDER BY created_at DESC LIMIT 10", ARRAY_A);
    echo '<h2>Последние результаты</h2>';
    echo '<table class="widefat"><thead><tr><th>Дата</th><th>Итог</th></tr></thead><tbody>';
    if ($results) {
        foreach ($results as $row) {
            $data = json_decode($row['result_json'], true);
            $final = '';
            if (is_array($data) && isset($data['result'])) {
                $final = esc_html($data['result']);
            }
            echo '<tr><td>' . esc_html($row['created_at']) . '</td><td>' . $final . '</td></tr>';
        }
    } else {
        echo '<tr><td colspan="2">Нет данных</td></tr>';
    }
    echo '</tbody></table>';

    echo '<iframe src="' . plugins_url('preview.html', __FILE__) . '" style="width:100%; height:400px; margin-top:20px;"></iframe>';
    echo '</div>';
}

function diagnostic_tree_editor_page() {
    if (!current_user_can('manage_options')) {
        return;
    }

    $tree_file = plugin_dir_path(__FILE__) . 'data/tree.json';
    $tree_json = file_exists($tree_file) ? file_get_contents($tree_file) : '';

    if (isset($_POST['diagnostic_tree_save'])) {
        check_admin_referer('diagnostic_tree_save');
        $new_json = wp_unslash($_POST['diagnostic_tree_json']);
        if (null === json_decode($new_json, true) && $new_json !== 'null') {
            echo '<div class="error"><p>Некорректный JSON</p></div>';
        } else {
            file_put_contents($tree_file, $new_json);
            $tree_json = $new_json;
            echo '<div class="updated"><p>Файл сохранен</p></div>';
        }
    }

    echo '<div class="wrap">';
    echo '<h1>Редактор дерева</h1>';
    echo '<form method="post">';
    wp_nonce_field('diagnostic_tree_save');
    echo '<textarea name="diagnostic_tree_json" rows="20" style="width:100%;">' . esc_textarea($tree_json) . '</textarea>';
    echo '<p><input type="submit" name="diagnostic_tree_save" class="button-primary" value="Сохранить" /></p>';
    echo '</form>';
    echo '</div>';
}

function diagnostic_enqueue_assets() {
    wp_enqueue_style('diagnostic-css', plugins_url('css/diagnostic.css', __FILE__));
    wp_enqueue_script('diagnostic-js', plugins_url('js/diagnostic.js', __FILE__), array(), false, true);

    $tree_path = plugin_dir_path(__FILE__) . 'data/tree.json';
    $tree = array();
    if (file_exists($tree_path)) {
        $tree = json_decode(file_get_contents($tree_path), true);
    }

    $data = array(
        'tree' => $tree,
        'telegram_link' => get_option('diagnostic_telegram', ''),
        'pdf_url' => admin_url('admin-post.php?action=download_diagnostic_pdf'),
        'pdf_nonce' => wp_create_nonce('download_diagnostic_pdf'),
        'enable_pdf' => (bool) get_option('diagnostic_enable_pdf', 1)
    );
    wp_localize_script('diagnostic-js', 'diagnosticTree', $data);
}
add_action('wp_enqueue_scripts', 'diagnostic_enqueue_assets');

function diagnostic_shortcode() {
    ob_start();
    ?>
    <div id="diagnostic-widget">
        <div class="progress-bar"><div class="fill"></div></div>
        <div class="device-svg"></div>
        <div class="diagnostic-steps"></div>
        <div class="diagnostic-result" style="display:none;"></div>
        <input type="hidden" id="diagnostic_data" name="diagnostic_data">
        <label><input type="checkbox" id="diagnostic_captcha"> Я не робот</label>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('device_diagnostic', 'diagnostic_shortcode');

if (class_exists('\Elementor\Widget_Base')) {
    class DeviceDiagnosticWidget extends \Elementor\Widget_Base {
        public function get_name() { return 'device_diagnostic'; }
        public function get_title() { return 'Device Diagnostic'; }
        public function get_icon() { return 'eicon-tools'; }
        public function get_categories() { return ['general']; }
        public function render() {
            echo do_shortcode('[device_diagnostic]');
        }
    }

    function diagnostic_register_elementor_widget( $widgets_manager ) {
        $widgets_manager->register( new DeviceDiagnosticWidget() );
    }
    add_action( 'elementor/widgets/register', 'diagnostic_register_elementor_widget' );
}

function diagnostic_handle_pdf() {
    check_admin_referer('download_diagnostic_pdf');

    if (!get_option('diagnostic_enable_pdf', 1)) {
        wp_die('PDF generation disabled');
    }

    $steps  = isset($_POST['diagnostic_steps']) ? wp_unslash($_POST['diagnostic_steps']) : '';
    $result = isset($_POST['diagnostic_result']) ? wp_unslash($_POST['diagnostic_result']) : '';

    global $wpdb;
    $table = $wpdb->prefix . 'diagnostic_results';
    $wpdb->insert($table, array(
        'result_json' => wp_json_encode(array('steps' => $steps, 'result' => $result)),
        'created_at'   => current_time('mysql')
    ));

    if (!class_exists('Dompdf\Dompdf')) {
        wp_die('PDF library missing');
    }

    $html = '<h1>Результат диагностики</h1>';
    $html .= '<p>' . esc_html($result) . '</p>';
    $html .= '<h3>Пройденные шаги</h3><pre>' . esc_html($steps) . '</pre>';

    $dompdf = new \Dompdf\Dompdf();
    $dompdf->loadHtml($html, 'UTF-8');
    $dompdf->setPaper('A4');
    $dompdf->render();
    $dompdf->stream('diagnostic.pdf');
    exit;
}
add_action('admin_post_download_diagnostic_pdf', 'diagnostic_handle_pdf');
add_action('admin_post_nopriv_download_diagnostic_pdf', 'diagnostic_handle_pdf');

