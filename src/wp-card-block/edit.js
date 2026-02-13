/**
 * Retrieves the translation of text.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-i18n/
 */
import { __ } from '@wordpress/i18n';

/**
 * Lets webpack process CSS, SASS or SCSS files referenced in JavaScript files.
 * Those files can contain any CSS code that gets applied to the editor.
 *
 * @see https://www.npmjs.com/package/@wordpress/scripts#using-css
 */
import './editor.scss';

import { useEffect } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { createBlock } from '@wordpress/blocks';

import { Placeholder, ColumnsEditContainer } from './components';
import { QUERY_LOOP_TRANSFORMS } from './constants';

/**
 * The edit function describes the structure of your block in the context of the
 * editor. This represents what the editor will render when the block is used.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 *
 * @return {Element} Element to render.
 */
export default function Edit( props ) {

	const { clientId, attributes, setAttributes, context } = props;
	const { isInQueryLoop } = attributes;
	
	const innerBlocks = useSelect( select => select( blockEditorStore ).getBlocks( clientId ), [ clientId ] );
	const { replaceInnerBlocks } = useDispatch( blockEditorStore );

	// Check if block is inside a Query Loop using Context
	const isInsideQueryLoop = Number.isFinite( context.queryId );

	useEffect( () => {
		if ( isInsideQueryLoop && ! isInQueryLoop ) {
			setAttributes( { isInQueryLoop: true } );
		} else if ( ! isInsideQueryLoop && isInQueryLoop ) {
			setAttributes( { isInQueryLoop: false } );
		}
	}, [ isInsideQueryLoop, isInQueryLoop, setAttributes ] );

	// Separate effect to log when specific conditions are met (e.g. variation selected inside loop)
	useEffect( () => {
		if ( isInQueryLoop && innerBlocks.length > 0 ) {
			// console.log( 'Block detected inside Query Loop', clientId );

			let headingReplaced = false;
			let paragraphReplaced = false;
			let hasChanged = false;

			const transformBlocks = ( blocks ) => {
				return blocks.map( ( block ) => {
					// Check if this block has a defined transform
					const transformTarget = QUERY_LOOP_TRANSFORMS[ block.name ];

					// Special handling for specific blocks to ensure only one of each is replaced per card if needed
					// For now, we'll replace all matching blocks, or we can add flags like we did before.
					// The previous logic had flags: headingReplaced, paragraphReplaced.
					// Let's reimplement that with the map.

					if ( transformTarget ) {
						// 1. Heading -> Post Title (First one only)
						if ( block.name === 'core/heading' ) {
							if ( ! headingReplaced ) {
								headingReplaced = true;
								hasChanged = true;
								return createBlock( transformTarget, { 
									level: block.attributes.level, 
									isLink: true 
								} );
							}
						}
						// 2. Paragraph -> Post Excerpt (First one only)
						else if ( block.name === 'core/paragraph' ) {
							if ( ! paragraphReplaced ) {
								paragraphReplaced = true;
								hasChanged = true;
								return createBlock( transformTarget );
							}
						}
						// 3. Others (Image, Button, etc.) - Replace all occurrences
						else {
							hasChanged = true;
							// Pass attributes for Image, but maybe simple createBlock for Button/ReadMore?
							// For Image -> Featured Image, we might want to keep some attrs (like size slug?), but Featured Image handles its own rendering.
							// For safely, let's pass attributes.
							return createBlock( transformTarget, { ...block.attributes } );
						}
					}

					// 4. Recurse for containers
					if ( block.innerBlocks.length > 0 ) {
						const newInnerBlocks = transformBlocks( block.innerBlocks );
						// If children changed, we need to recreate this container to attach new children
						// We can verify if children actually changed by comparing referentially if we wanted optimization,
						// but simpler to just strictly recreate if we are in a 'hasChanged' flow.
						// However, to correctly propagate `hasChanged` from deep recursion we rely on the closure variable.
						// If the recursive call set `hasChanged = true`, we must return a new block.
						
						// IMPORTANT: block.innerBlocks is the old array. newInnerBlocks is the new array.
						// We can't easily equality check arrays here without deep compare, 
						// but we rely on the 'hasChanged' flag being flipped by the children logic.
						// To be safe, if we recurse, we should return a block with new inner blocks.
						return createBlock( block.name, block.attributes, newInnerBlocks );
					}

					return block;
				} );
			};

			const newBlocks = transformBlocks( innerBlocks );

			if ( hasChanged ) {
				console.log( 'Auto-transforming blocks for Query Loop context...' );
				replaceInnerBlocks( clientId, newBlocks, false );
			}
		}
	}, [ isInQueryLoop, innerBlocks, clientId, replaceInnerBlocks ] );

	const hasInnerBlocks = innerBlocks.length > 0;
	const Component = hasInnerBlocks ? ColumnsEditContainer : Placeholder;

	return <Component { ...props } />;
}
