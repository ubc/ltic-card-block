/**
 * Mapping of standard blocks to their Query Loop counterparts.
 * Key: Standard block name (as used in variations)
 * Value: Post block name (as replaced inside a Query Loop)
 */
export const QUERY_LOOP_TRANSFORMS = {
	'core/image': 'core/post-featured-image',
	'core/heading': 'core/post-title',
	'core/paragraph': 'core/post-excerpt',
	'core/button': 'core/read-more',
};
