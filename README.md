# Device Diagnostic Plugin

This plugin provides a step‑by‑step device diagnostic wizard for WordPress. Users can select a device, answer questions from a decision tree and receive recommendations with an option to download the result as PDF and contact the repair shop via Telegram, Viber or WhatsApp.

## Features

- Shortcode `[device_diagnostic]` to display the diagnostic widget
- Elementor widget for drag‑and‑drop integration
- Admin settings page to configure messenger links, custom styles and manage the diagnostic tree
- Stores diagnostic results in the `wp_diagnostic_results` table and shows the last ten entries
- Optional PDF generation using `dompdf/dompdf`

## Installation

1. Install dependencies with `composer install` inside the plugin directory.
2. Upload the plugin to your WordPress installation and activate it.
3. Configure settings under **Диагностика** in the admin menu.

## Usage

Add the shortcode to any post or page:

```[device_diagnostic]```

For Elementor, use the *Device Diagnostic* widget.
