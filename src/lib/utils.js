import murmur from 'murmurhash-js'
import config from './config'

let __internalState = {
	counter: 0
}

export const getInternalState = property => property ? __internalState[property] : __internalState

export const setInternalState = input => {
	const nextState = (
		typeof input === 'object'
			? input
			: typeof input === 'function' && input(__internalState)
		)

	__internalState = {
		...__internalState,
		...nextState
	}
}

export const getAlphabeticChar = code => String.fromCharCode(code + (code > 25 ? 39 : 97))

export const generateAlphabeticName = code => {
	const charsLength = 52
	let name = ''
	let x

	for (x = code; x > charsLength; x = Math.floor(x / charsLength)) {
		name = getAlphabeticChar(x % charsLength) + name
	}

	return getAlphabeticChar(x % charsLength) + name
};

export const hash = key => generateAlphabeticName(murmur(key, config.seed));

export const createClassName = (styledComponentId, style) => hash(styledComponentId + style)

export const stringifyClasses = propsClass => {
	if (typeof propsClass === 'string') return propsClass

	if (Array.isArray(propsClass)) {
		return propsClass
			.filter(Boolean)
			.join(' ')
	}

	if (typeof propsClass === 'object') {
		return Object.entries(propsClass)
			.reduce((acc, entry) => {
				const [className, condition] = entry
				if (condition) {
					acc = `${acc} ${className}`
				}

				return acc
			}, '')
			.trim()
	}

	return ''
}
