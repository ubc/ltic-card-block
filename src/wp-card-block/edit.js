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

import { Placeholder, EditContainer } from './components';
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
	const { isInQueryLoop, linkEnabled, variationType, transformedVariation } = attributes;

	const innerBlocks = useSelect( select => select( blockEditorStore ).getBlocks( clientId ), [ clientId ] );
	const { replaceInnerBlocks, updateBlockAttributes } = useDispatch( blockEditorStore );

	// Check if block is inside a Query Loop using Context
	const isInsideQueryLoop = Number.isFinite( context.queryId );

	useEffect( () => {
		if ( isInsideQueryLoop && ! isInQueryLoop ) {
			setAttributes( { isInQueryLoop: true } );
		} else if ( ! isInsideQueryLoop && isInQueryLoop ) {
			// Leaving the Query Loop: also clear the conversion latch so that a
			// later move back INTO a loop counts as a fresh entry and converts any
			// static placeholders again. Existing dynamic blocks are still protected
			// from double-conversion by the duplicate-target check.
			setAttributes( { isInQueryLoop: false, transformedVariation: '' } );
		}
	}, [ isInsideQueryLoop, isInQueryLoop, setAttributes ] );

	// Convert the variation's static placeholder blocks (heading, paragraph,
	// image, button) into their dynamic Query Loop equivalents (post title,
	// post excerpt, featured image, read-more).
	//
	// This conversion must only happen ONCE per variation application — i.e. when
	// the card first enters a Query Loop or when its variation actually changes.
	// We remember the last variation we transformed in the persisted
	// `transformedVariation` attribute so that:
	//   1. Blocks the user *manually* adds afterwards are left untouched.
	//   2. The manual blocks survive a page reload (the attribute is saved).
	// Keeping the "Entire Card as Link" state in sync is handled separately below
	// via updateBlockAttributes, so a setting change never recreates blocks here.
	useEffect( () => {
		// Gate on the live Query Loop context, not the persisted `isInQueryLoop`
		// attribute (which is only set a render later), so the conversion isn't
		// skipped on the render where the card first receives its template.
		if ( ! isInsideQueryLoop || innerBlocks.length === 0 ) {
			return;
		}

		const allowConversion = transformedVariation !== variationType;

		if ( ! allowConversion ) {
			return;
		}

		let hasChanged = false;

		// Collect the dynamic target blocks (post title, post excerpt, featured
		// image, read-more) that already exist anywhere in the card. A static
		// block is only converted when its target isn't present yet, so we never
		// create a duplicate — e.g. if a Post Excerpt already exists, a paragraph
		// is left as-is instead of becoming a second excerpt.
		const transformTargets = Object.values( QUERY_LOOP_TRANSFORMS );
		const existingTargets = new Set();
		const collectExistingTargets = ( blocks ) => {
			blocks.forEach( ( block ) => {
				if ( transformTargets.includes( block.name ) ) {
					existingTargets.add( block.name );
				}
				if ( block.innerBlocks.length > 0 ) {
					collectExistingTargets( block.innerBlocks );
				}
			} );
		};
		collectExistingTargets( innerBlocks );

		const transformBlocks = ( blocks ) => {
			return blocks.map( ( block ) => {
				const transformTarget = QUERY_LOOP_TRANSFORMS[ block.name ];

				// Convert the static placeholder into its dynamic counterpart, but
				// only the first one of each type — if the target already exists
				// (pre-existing, or created earlier in this pass) leave it untouched.
				if ( transformTarget && ! existingTargets.has( transformTarget ) ) {
					existingTargets.add( transformTarget );
					hasChanged = true;

					// Heading -> Post Title (carry heading level, honour link state)
					if ( block.name === 'core/heading' ) {
						return createBlock( transformTarget, {
							level: block.attributes.level,
							isLink: ! linkEnabled // Only link if parent link is disabled
						} );
					}

					// Paragraph -> Post Excerpt
					if ( block.name === 'core/paragraph' ) {
						return createBlock( transformTarget );
					}

					// Image, Button, etc.
					const newAttributes = { ...block.attributes };
					if ( transformTarget === 'core/post-featured-image' ) {
						newAttributes.isLink = ! linkEnabled;
					}
					return createBlock( transformTarget, newAttributes );
				}

				// Recurse into containers, but only rebuild a container when a
				// child actually changed — otherwise return the original block so
				// untouched blocks keep their clientId (and the user's selection).
				if ( block.innerBlocks.length > 0 ) {
					const newInnerBlocks = transformBlocks( block.innerBlocks );
					const childrenChanged = newInnerBlocks.some(
						( child, index ) => child !== block.innerBlocks[ index ]
					);
					return childrenChanged
						? createBlock( block.name, block.attributes, newInnerBlocks )
						: block;
				}

				return block;
			} );
		};

		const newBlocks = transformBlocks( innerBlocks );

		// Mark this variation as processed ONLY once the card is actually in its
		// dynamic form — i.e. we just converted something, or a dynamic target
		// block already exists. This avoids latching prematurely on a render where
		// the template placeholders haven't arrived yet (which would permanently
		// block the migration), while still protecting blocks the user adds later.
		if ( hasChanged || existingTargets.size > 0 ) {
			setAttributes( { transformedVariation: variationType } );
		}

		if ( hasChanged ) {
			replaceInnerBlocks( clientId, newBlocks, false );
		}
	}, [ isInsideQueryLoop, innerBlocks, clientId, replaceInnerBlocks, linkEnabled, variationType, transformedVariation, setAttributes ] );

	// Keep the dynamic child blocks (post title, featured image) in sync with the
	// card-level "Entire Card as Link" toggle. When the whole card is a link, the
	// inner blocks must NOT be links too (nested <a> is invalid), and vice versa.
	// This updates the attribute in place with updateBlockAttributes, so the blocks
	// keep their identity (clientId) — toggling the setting no longer rebuilds them
	// or drops the editor's selection/focus.
	useEffect( () => {
		if ( ! isInsideQueryLoop || innerBlocks.length === 0 ) {
			return;
		}

		const desiredIsLink = ! linkEnabled;
		const staleClientIds = [];

		const collectStaleLinks = ( blocks ) => {
			blocks.forEach( ( block ) => {
				if (
					( block.name === 'core/post-title' || block.name === 'core/post-featured-image' ) &&
					block.attributes.isLink !== desiredIsLink
				) {
					staleClientIds.push( block.clientId );
				}
				if ( block.innerBlocks.length > 0 ) {
					collectStaleLinks( block.innerBlocks );
				}
			} );
		};
		collectStaleLinks( innerBlocks );

		if ( staleClientIds.length > 0 ) {
			updateBlockAttributes( staleClientIds, { isLink: desiredIsLink } );
		}
	}, [ isInsideQueryLoop, innerBlocks, linkEnabled, updateBlockAttributes ] );

	const hasInnerBlocks = innerBlocks.length > 0;
	const Component = hasInnerBlocks ? EditContainer : Placeholder;

	return <Component { ...props } />;
}
