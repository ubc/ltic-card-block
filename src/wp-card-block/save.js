/**
 * React hook that is used to mark the block wrapper element.
 * It provides all the necessary props like the class name.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#useblockprops
 */
import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';
import { LINK_VARIATION_TRANSFORM } from './constants';

/**
 * The save function defines the way in which the different attributes should
 * be combined into the final markup, which is then serialized by the block
 * editor into `post_content`.
 *
 *
 */

export default function save( { attributes } ) {
    const { variationType, linkEnabled, isEqualHeight } = attributes;
	const blockProps = useBlockProps.save( {
		className: isEqualHeight ? 'is-equal-height' : undefined
	} );

    // If the current variation is a key in LINK_VARIATION_TRANSFORM, it means
    // it's a variation that *should* transform to something else (e.g. card-2 -> card-1).
    // These variations (card-2, card-4) do NOT contain buttons. Thus, they are restricted
    // from being full-card links, and will NOT be wrapped in an <a> tag or have the linked data attribute.
    const isRestrictedVariation = LINK_VARIATION_TRANSFORM.hasOwnProperty( variationType );

	if ( ! isRestrictedVariation && linkEnabled ) {
		return (
			<div 
				{ ...blockProps }
				data-linked="true"
			>
				<InnerBlocks.Content />
			</div>
		);
	}

	return (
		<div { ...blockProps }>
			<InnerBlocks.Content />
		</div>
	);
}
