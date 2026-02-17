/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, useInnerBlocksProps, __experimentalBlockVariationPicker, store as blockEditorStore, InspectorControls } from '@wordpress/block-editor';
import { createBlock, createBlocksFromInnerBlocksTemplate, store as blocksStore } from '@wordpress/blocks';
import { useSelect, useDispatch } from '@wordpress/data';
import { useEffect } from '@wordpress/element';

/**
 * Internal dependencies
 */
import variations from './variations';
import { QUERY_LOOP_TRANSFORMS } from './constants';

export function Placeholder( { clientId, name, setAttributes } ) {
	const { blockType, defaultVariation, variations } = useSelect(
		( select ) => {
			const {
				getBlockVariations,
				getBlockType,
				getDefaultBlockVariation,
			} = select( blocksStore );

			return {
				blockType: getBlockType( name ),
				defaultVariation: getDefaultBlockVariation( name, 'block' ),
				variations: getBlockVariations( name, 'block' ),
			};
		},
		[ name ]
	);
	const { replaceInnerBlocks } = useDispatch( blockEditorStore );
	const blockProps = useBlockProps();

	return (
		<div { ...blockProps }>
			<__experimentalBlockVariationPicker
				icon={ blockType?.icon?.src }
				label={ blockType?.title }
				variations={ variations }
				instructions={ __( 'Select a card layout to start:' ) }
				onSelect={ ( nextVariation = defaultVariation ) => {
					if ( nextVariation.attributes ) {
						setAttributes( nextVariation.attributes );
					}
					if ( nextVariation.innerBlocks ) {
						replaceInnerBlocks(
							clientId,
							createBlocksFromInnerBlocksTemplate(
								nextVariation.innerBlocks
							),
							false
						);
					}
				} }
				allowSkip
			/>
		</div>
	);
}

/**
 * Recursively maps source blocks to a target template.
 *
 * @param {Array} targetBlocks Template blocks to populate.
 * @param {Array} sourceBlockPool Source blocks to draw from.
 * @return {Array} The populated blocks.
 */
const populateTemplate = ( targetBlocks, sourceBlockPool ) => {
	return targetBlocks.map( ( targetBlock ) => {
		// 1. Try to find a direct match in the pool
		const matchIndex = sourceBlockPool.findIndex( ( b ) => {
			if ( b.name === targetBlock.name ) {
				return true;
			}
			// Allow substitutions for Query Loop contexts using the shared mapping
			if ( QUERY_LOOP_TRANSFORMS[ targetBlock.name ] === b.name ) {
				return true;
			}
			return false;
		} );

		if ( matchIndex !== -1 ) {
			const [ match ] = sourceBlockPool.splice( matchIndex, 1 );

			// Simple attribute merge: Match (user content) wins over Target (variation default).
			// This means if the user has customized the block, their settings are preserved.
			// But if the user hasn't set an attribute, the variation default is used.
			const mergedAttributes = { ...targetBlock.attributes, ...match.attributes };

			// If the match is a container (inner-text-block) and has children, we generally want to keep them.
			// However, if the template dictates a specific structure for that container, we might ideally recurse.
			// For now, we trust the existing container's content (match.innerBlocks).
			
			return createBlock( match.name, mergedAttributes, match.innerBlocks );
		}

		// 2. If no direct match, and this is a container, recurse to see if we can fill it from the pool
		if ( targetBlock.innerBlocks.length > 0 ) {
			const newInnerBlocks = populateTemplate( targetBlock.innerBlocks, sourceBlockPool );
			return createBlock( targetBlock.name, targetBlock.attributes, newInnerBlocks );
		}

		// 3. Keep empty template block
		return targetBlock;
	} );
};

export function EditContainer( { attributes, setAttributes, clientId } ) {
	const { variationType } = attributes;
	const { replaceInnerBlocks } = useDispatch( blockEditorStore );
	const innerBlocks = useSelect( select => select( blockEditorStore ).getBlocks( clientId ), [ clientId ] );
	
	useEffect( () => {
		const targetVariation = variations.find( ( v ) => v.attributes.variationType === variationType );
		
		if ( targetVariation?.innerBlocks ) {
			const template = targetVariation.innerBlocks;
			const templateBlocks = createBlocksFromInnerBlocksTemplate( template );
			
			// Deep clone source blocks to avoid mutation issues during splice
			const sourceBlockPool = innerBlocks.map( ( block ) => ( { ...block } ) ); 
			
			const newInnerBlocks = populateTemplate( templateBlocks, sourceBlockPool );

			// Check if we need to update to avoid loop
			// Compare by block names to avoid unnecessary updates/loops
			const currentSignature = innerBlocks.map( ( b ) => b.name ).join( '|' );
			const newSignature = newInnerBlocks.map( ( b ) => b.name ).join( '|' );

			if ( currentSignature !== newSignature ) {
				replaceInnerBlocks( clientId, newInnerBlocks, false );
			}
		}
	}, [ variationType, clientId, innerBlocks, replaceInnerBlocks ] );

	const classes = '';

	const blockProps = useBlockProps( {
		className: classes,
	} );
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		directInsert: true,
		orientation: 'horizontal',
		renderAppender: false,
		templateLock: 'all',
	} );

	return (
		<>
			<InspectorControls>
			</InspectorControls>
			<div { ...innerBlocksProps } />
		</>
	);
}
