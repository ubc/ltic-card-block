<?php
// This file is generated. Do not modify it manually.
return array(
	'wp-card-block' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'ltic/card-block',
		'version' => '0.1.0',
		'title' => 'Card Block',
		'category' => 'widgets',
		'description' => 'A flexible card block that allows different layouts.',
		'supports' => array(
			'html' => false
		),
		'attributes' => array(
			'variationType' => array(
				'type' => 'string',
				'default' => 'card-1'
			),
			'isInQueryLoop' => array(
				'type' => 'boolean',
				'default' => false
			),
			'linkEnabled' => array(
				'type' => 'boolean',
				'default' => false
			)
		),
		'styles' => array(
			array(
				'name' => 'default',
				'label' => 'Default',
				'isDefault' => true
			),
			array(
				'name' => 'style-2',
				'label' => 'Style 2'
			),
			array(
				'name' => 'style-3',
				'label' => 'Style 3'
			)
		),
		'textdomain' => 'wp-card-block',
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'style' => 'file:./style-index.css',
		'viewScript' => 'file:./view.js',
		'usesContext' => array(
			'queryId'
		)
	),
	'wp-card-inner-text-block' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'ltic/card-inner-text-block',
		'version' => '0.1.0',
		'title' => 'Card Inner Text Block',
		'category' => 'widgets',
		'parent' => array(
			'ltic/card-block'
		),
		'description' => 'A flexible card inner text block.',
		'supports' => array(
			'html' => false
		),
		'attributes' => array(
			'templateLock' => array(
				'type' => 'string',
				'enum' => array(
					'all',
					'insert',
					'false'
				)
			)
		),
		'textdomain' => 'wp-card-block',
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'style' => 'file:./style-index.css',
		'viewScript' => 'file:./view.js'
	)
);
