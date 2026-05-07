export function isContentHidden(hidden?: boolean, draft?: boolean) {
	return hidden || (draft && !import.meta.dev)
}
