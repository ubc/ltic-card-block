/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, useInnerBlocksProps, __experimentalBlockVariationPicker, store as blockEditorStore, BlockControls, __experimentalLinkControl, InspectorControls } from '@wordpress/block-editor';
import { createBlock, createBlocksFromInnerBlocksTemplate, store as blocksStore } from '@wordpress/blocks';
import { useSelect, useDispatch } from '@wordpress/data';
import { useEffect, useState, useRef } from '@wordpress/element';	
import { Toolbar, ToolbarButton, PanelBody, Notice, Modal, Button, ToggleControl } from '@wordpress/components';

/**
 * Internal dependencies
 */
import variations from './variations';
import { QUERY_LOOP_TRANSFORMS, LINK_VARIATION_TRANSFORM } from './constants';

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

export function EditContainer( { attributes, setAttributes, clientId, isSelected } ) {
	const { variationType, linkEnabled, isInQueryLoop, isEqualHeight } = attributes;
	const { replaceInnerBlocks } = useDispatch( blockEditorStore );
	const { innerBlocks, parentBlockName } = useSelect( select => {
		const { getBlocks, getBlockName, getBlockRootClientId } = select( blockEditorStore );
		const rootClientId = getBlockRootClientId( clientId );
		return {
			innerBlocks: getBlocks( clientId ),
			parentBlockName: getBlockName( rootClientId )
		};
	}, [ clientId ] );
	
	const isInsideEqualHeightContainer = parentBlockName === 'core/column' || parentBlockName === 'core/post-template';

	useEffect( () => {
		const targetVariation = variations.find( ( v ) => v.attributes.variationType === variationType );
		
		if ( targetVariation?.innerBlocks ) {
			const template = targetVariation.innerBlocks;
			const templateBlocks = createBlocksFromInnerBlocksTemplate( template );
			
			// Deep clone source blocks to avoid mutation issues during splice
			const sourceBlockPool = innerBlocks.map( ( block ) => ( { ...block } ) ); 
			
			const newInnerBlocks = populateTemplate( templateBlocks, sourceBlockPool );

            // Default image logic
            // Check if there is an image block in the new variation's innerBlocks
            const imageBlock = newInnerBlocks.find( block => block.name === 'core/image' );
            
            if ( imageBlock && ! imageBlock.attributes.url && ! imageBlock.attributes.id ) {
                // Check if lticCardBlockData is available
                if ( typeof window.lticCardBlockData !== 'undefined' && window.lticCardBlockData.defaultImageUrl ) {
                    imageBlock.attributes.url = window.lticCardBlockData.defaultImageUrl;
                    imageBlock.attributes.alt = __( 'Default Image', 'wp-card-block' );
                }
            }

			// Check if we need to update to avoid loop
			// Compare by block names to avoid unnecessary updates/loops
			// Also need to compare attributes now since we might have changed them (image url)
            // But checking deep equality is expensive. 
            // Simple check: same block names?
			const currentSignature = innerBlocks.map( ( b ) => b.name + (b.name === 'core/image' ? b.attributes.url : '') ).join( '|' );
			const newSignature = newInnerBlocks.map( ( b ) => b.name + (b.name === 'core/image' ? b.attributes.url : '') ).join( '|' );

			if ( currentSignature !== newSignature ) {
				replaceInnerBlocks( clientId, newInnerBlocks, false );
			}
		}
	}, [ variationType, clientId, innerBlocks, replaceInnerBlocks ] );

	const classes = isEqualHeight ? 'is-equal-height' : '';

	const blockProps = useBlockProps( {
		className: classes,
        'data-linked': linkEnabled ? 'true' : undefined
	} );
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		directInsert: true,
		orientation: 'horizontal',
		renderAppender: false,
		templateLock: 'all',
	} );



    // Track previous variation to allow reverting
    const prevVariationTypeCallback = useRef( variationType );
    useEffect( () => {
        prevVariationTypeCallback.current = variationType;
    }, [ variationType ] );
    const prevVariationType = prevVariationTypeCallback.current;

    const [ showConfirmationModal, setShowConfirmationModal ] = useState( false );
    const [ variationToRevert, setVariationToRevert ] = useState( null );
    
    // State for auto-transform confirmation
    const [ showTransformModal, setShowTransformModal ] = useState( false );
    const [ pendingAttributes, setPendingAttributes ] = useState( null );

    // Check for conflict: Restricted variation + URL present
    useEffect( () => {
        // Only run if variation has changed to avoid running on initial load
        if ( variationType === prevVariationType ) {
            return;
        }

        // Only the selected block should handle the UI for confirmation
        // This prevents all instances in a Query Loop from firing modals simultaneously
        if ( ! isSelected ) {
            return;
        }

        if ( LINK_VARIATION_TRANSFORM[ variationType ] && linkEnabled ) {
             setVariationToRevert( prevVariationType );
             setShowConfirmationModal( true );
        }
    }, [ variationType, linkEnabled, prevVariationType, isSelected ] );

    const onConfirmRemoval = () => {
        setAttributes( { linkEnabled: false } );
        setShowConfirmationModal( false );
        setVariationToRevert( null );
    };

    const onCancelRemoval = () => {
        if ( variationToRevert ) {
            setAttributes( { variationType: variationToRevert } );
        }
        setShowConfirmationModal( false );
        setVariationToRevert( null );
    };

	const onToggleChange = () => {
		const newAttributes = {
			linkEnabled: ! linkEnabled
		};

		// Auto-transform logic interception
		if ( ! linkEnabled && LINK_VARIATION_TRANSFORM[ variationType ] ) {
			const targetVariationName = LINK_VARIATION_TRANSFORM[ variationType ];
			newAttributes.variationType = targetVariationName;
			
			setPendingAttributes( newAttributes );
			setShowTransformModal( true );
			return; 
		}

        setAttributes( newAttributes );
	};

    const onConfirmTransform = () => {
        if ( pendingAttributes ) {
            setAttributes( pendingAttributes );
        }
        setShowTransformModal( false );
        setPendingAttributes( null );
    };

    const onCancelTransform = () => {
        setShowTransformModal( false );
        setPendingAttributes( null );
    };



	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Card Settings', 'wp-card-block' ) }>
					<ToggleControl
						label={ __( 'Entire Card as Link', 'wp-card-block' ) }
						checked={ linkEnabled }
						onChange={ onToggleChange }
					/>
					<ToggleControl
						label={ __( 'Equal Height', 'wp-card-block' ) }
						checked={ isEqualHeight }
						onChange={ ( value ) => setAttributes( { isEqualHeight: value } ) }
						disabled={ ! isInsideEqualHeightContainer }
						help={ ! isInsideEqualHeightContainer ? __( 'Only available when inside a Column or Post Template block.', 'wp-card-block' ) : undefined }
					/>
				</PanelBody>
			</InspectorControls>
			<div { ...innerBlocksProps } />
            { showConfirmationModal && (
                <Modal
                    title={ __( 'Remove Link?', 'wp-card-block' ) }
                    onRequestClose={ onCancelRemoval }
                >
                    <p>
                        { __( 'The "Entire Card as Link" feature requires your card to have a visible button to provide a clear call-to-action for users. You are switching to a layout without a button. By confirming, the existing link on the card will be removed. Do you want to proceed?', 'wp-card-block' ) }
                    </p>
                    <div style={ { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' } }>
                        <Button variant="secondary" onClick={ onCancelRemoval }>
                            { __( 'Cancel', 'wp-card-block' ) }
                        </Button>
                        <Button variant="primary" onClick={ onConfirmRemoval }>
                            { __( 'Proceed', 'wp-card-block' ) }
                        </Button>
                    </div>
                </Modal>
            ) }
            { showTransformModal && (
                <Modal
                    title={ __( 'Layout Change Required', 'wp-card-block' ) }
                    onRequestClose={ onCancelTransform }
                >
                    <p>
                        { __( 'To provide a clear, accessible call-to-action for users, the "Entire Card as Link" feature requires a visible button on the card. Enabling this feature will automatically switch your card to a layout that includes a button. Do you want to proceed?', 'wp-card-block' ) }
                    </p>
                    <div style={ { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' } }>
                        <Button variant="secondary" onClick={ onCancelTransform }>
                            { __( 'Cancel', 'wp-card-block' ) }
                        </Button>
                        <Button variant="primary" onClick={ onConfirmTransform }>
                            { __( 'Proceed', 'wp-card-block' ) }
                        </Button>
                    </div>
                </Modal>
            ) }
		</>
	);
}
