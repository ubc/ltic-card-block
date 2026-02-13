/**
 * WordPress dependencies
 */
import { SVG, Rect } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/** @typedef {import('@wordpress/blocks').WPBlockVariation} WPBlockVariation */

/**
 * Template option choices for predefined columns layouts.
 *
 * @type {WPBlockVariation[]}
 */
const variations = [
	{
		name: 'card-1',
		title: __( 'A card block that includes an image, a text content section and a button' ),
		description: __( 'A card block that includes an image, a text content section and a button' ),
		icon: (
			<SVG
				xmlns="http://www.w3.org/2000/svg"
				width="200"
				height="200"
				viewBox="0 0 200 200"
				style={ { width: '200px', height: '200px' } }
			>
				<Rect x="36" y="20" width="128" height="160" rx="8" stroke="currentColor" fill="none" strokeWidth="6" />
				<Rect x="52" y="36" width="96" height="80" fill="currentColor" opacity="0.2" />
				<Rect x="52" y="128" width="80" height="12" fill="currentColor" />
				<Rect x="52" y="148" width="96" height="8" fill="currentColor" opacity="0.5" />
				<Rect x="52" y="160" width="48" height="12" fill="currentColor" />
			</SVG>
		),
		innerBlocks: [
			[ 'core/image' ],
			[ 'ltic/card-inner-text-block', {
                templateLock: 'false',
            }, [
				[ 'core/heading' ],
				[ 'core/paragraph' ],
			] ],
			[ 'core/button', {
                backgroundColor: 'accent-3', // theme color slug
                text: 'Read More',
            } ],
		],
		isDefault: true,
		scope: [ 'block', 'transform' ],
		attributes: {
			variationType: 'pattern-1'
		},
		isActive: ( attributes, variationAttributes ) => attributes.variationType === variationAttributes.variationType
	},
	{
		name: 'card-2',
		title: __( 'A card block that includes an image and a text content section' ),
		description: __( 'A card block that includes an image and a text content section' ),
		icon: (
			<SVG
				xmlns="http://www.w3.org/2000/svg"
				width="200"
				height="200"
				viewBox="0 0 200 200"
				style={ { width: '200px', height: '200px' } }
			>
				<Rect x="36" y="20" width="128" height="160" rx="8" stroke="currentColor" fill="none" strokeWidth="6" />
				<Rect x="52" y="36" width="96" height="80" fill="currentColor" opacity="0.2" />
				<Rect x="52" y="128" width="80" height="12" fill="currentColor" />
				<Rect x="52" y="148" width="96" height="8" fill="currentColor" opacity="0.5" />
			</SVG>
		),
		isDefault: false,
		innerBlocks: [
			[ 'core/image' ],
			[ 'ltic/card-inner-text-block', {
                templateLock: 'false',
            }, [
				[ 'core/heading' ],
				[ 'core/paragraph' ],
			] ]
		],
		scope: [ 'block', 'transform' ],
		attributes: {
			variationType: 'pattern-2'
		},
		isActive: ( attributes, variationAttributes ) => attributes.variationType === variationAttributes.variationType
	}
];

export default variations;