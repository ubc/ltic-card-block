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
    const { url, linkTarget, rel, variationType, isInQueryLoop, linkEnabled } = attributes;
	const blockProps = useBlockProps.save();

    // If the current variation is a key in LINK_VARIATION_TRANSFORM, it means
    // it's a variation that *should* transform to something else (e.g. card-1 -> card-2).
    // These variations (card-1, card-3) contain buttons, so we should NOT wrap them in an <a> tag.
    const isRestrictedVariation = LINK_VARIATION_TRANSFORM.hasOwnProperty( variationType );

	if ( ! isRestrictedVariation && linkEnabled ) {
		if ( isInQueryLoop ) {
			return (
				<a 
					href='#' 
					{ ...blockProps }
				>
					<InnerBlocks.Content />
				</a>
			);
		}

		if ( ! isInQueryLoop ) {
			return (
				<a 
					href={ url } 
					target={ linkTarget } 
					rel={ rel } 
					{ ...blockProps }
				>
					<InnerBlocks.Content />
				</a>
			);
		}
	}

	return (
		<div { ...blockProps }>
			<InnerBlocks.Content />
		</div>
	);
}
