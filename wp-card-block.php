<?php
/**
 * Plugin Name:       WP Card Block
 * Description:       LTIC implementation of WP Card Block.
 * Version:           0.1.0
 * Requires at least: 6.8
 * Requires PHP:      7.4
 * Author:            LTIC WordPress
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       wp-card-block
 *
 * @package WP Card Block
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}
/**
 * Registers the block(s) metadata from the `blocks-manifest.php` and registers the block type(s)
 * based on the registered block metadata. Behind the scenes, it registers also all assets so they can be enqueued
 * through the block editor in the corresponding context.
 *
 * @see https://make.wordpress.org/core/2025/03/13/more-efficient-block-type-registration-in-6-8/
 * @see https://make.wordpress.org/core/2024/10/17/new-block-type-registration-apis-to-improve-performance-in-wordpress-6-7/
 */
function ltic_card_block_registration() {
	wp_register_block_types_from_metadata_collection( __DIR__ . '/build', __DIR__ . '/build/blocks-manifest.php' );
}
add_action( 'init', 'ltic_card_block_registration' );

/**
 * Enqueue block editor assets
 */
function ltic_card_block_enqueue_editor_assets() {
	$default_image_url = plugins_url( 'default-image.png', __FILE__ );
	wp_localize_script(
		'ltic-card-block-editor-script',
		'lticCardBlockData',
		array(
			'defaultImageUrl' => $default_image_url,
		)
	);
}
add_action( 'enqueue_block_editor_assets', 'ltic_card_block_enqueue_editor_assets' );

/**
 * Render block hook to inject dynamic link functionality for Card Block in Query Loops.
 *
 * @param string $block_content The block content.
 * @param array  $block         The block data.
 * @return string Modified block content.
 */
function ltic_card_block_render_callback( $block_content, $block ) {
	if ( 'ltic/card-block' !== $block['blockName'] ) {
		return $block_content;
	}

	// Check if isInQueryLoop and linkEnabled are true.
	$is_in_query_loop = isset( $block['attrs']['isInQueryLoop'] ) && $block['attrs']['isInQueryLoop'];
	$link_enabled     = isset( $block['attrs']['linkEnabled'] ) && $block['attrs']['linkEnabled'];

	if ( $is_in_query_loop && $link_enabled ) {
		// We are in a query loop and link is enabled.
		// The block should have been rendered with an <a> tag by save.js (if not restricted).
		// We need to replace the href with the current post permalink.
		// Note: In a Query Loop, the global $post object is set to the current post in the loop.
		
		$permalink = get_permalink();

		if ( ! $permalink ) {
			return $block_content;
		}

		$tags = new WP_HTML_Tag_Processor( $block_content );
		if ( $tags->next_tag( 'a' ) ) {
			$tags->set_attribute( 'href', $permalink );
			return $tags->get_updated_html();
		}
	}

	return $block_content;
}
add_filter( 'render_block', 'ltic_card_block_render_callback', 10, 2 );
