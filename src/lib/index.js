/** @jsx dom */
import dom from 'magic-virtual-element'
import stylis from 'stylis'
import murmur from 'murmurhash-js'
import equal from 'fast-equals'
import events from 'deku/lib/events'
import htmlAttributes from '../utils/html-attributes'
import domElements from '../utils/dom-elements'

const SEED = 'testing seed'

let __internalState = {
	counter: 0
}

const getInternalState = property => property ? __internalState[property] : __internalState

const setInternalState = nextState => {
	__internalState = {
		...__internalState,
		...nextState
	}
}

const generateAlphabeticName = code => {
	const charsLength = 52;
	const getAlphabeticChar = code => String.fromCharCode(code + (code > 25 ? 39 : 97));
	let name = '';
	let x;

	for (x = code; x > charsLength; x = Math.floor(x / charsLength)) {
		name = getAlphabeticChar(x % charsLength) + name;
	}

	return getAlphabeticChar(x % charsLength) + name;
};

const hash = key => generateAlphabeticName(murmur(key, SEED));

const createClassName = (componentId, style) => hash(componentId + style)

const evaluateStyle = (strings, expressions, props, styledId) => {
	const interpolated = strings
		.map((string, i) => {
			const expression = expressions[i]
			const functionExpression = typeof expression === 'function' && expression
			const objectExpression = typeof expression === 'object' && '.' + expression.styledId
			const stringExpression = typeof expression === 'string' && expression

			const handledExpression = (
				functionExpression && functionExpression(props) ||
				objectExpression ||
				stringExpression ||
				''
			)

			return `${string}${handledExpression}`
		})
		.join('')

	const className = '.' + createClassName(styledId, interpolated)

	return {
		css: stylis(className, interpolated),
		interpolated
	}
}

const getHeadStyleTag = () => {
	let styleElement = document.querySelector('[data-styled-container="true"]')

	if (!styleElement) {
		styleElement = document.createElement('style')
		styleElement.setAttribute('data-styled-container', true)

		document.head.appendChild(styleElement)
	}

	return styleElement
}

const splitStyle = style => style
	.split(/}/gi)
	.filter(Boolean)
	.map(string => string + '}')

const injectStyle = (style, styledId) => {
	const className = createClassName(styledId, style)
	const styleTag = getHeadStyleTag()
	const styleSheet = styleTag.sheet
	const rules = splitStyle(style)
	const ruleExists = Array.from(styleSheet.rules).find(rule => {
		const selectors = style
			.replace(/({.+!?\.)|({.+})/gi, ' .')
			.split('.')
			.map(string => string.trim())
			.filter(Boolean)
			.map(s => '.' + s)

		return selectors.includes(rule.selectorText)
	})

	if (style && !ruleExists) {
		rules.forEach(rule => styleSheet.insertRule(rule, 0))
	}
}

const evaluateAndInject = (strings, expressions, props, state, componentId, setState, isStatic) => {
	if (isStatic && state.style) {
		return false
	}

	const {css, interpolated} = evaluateStyle(strings, expressions, props, componentId)

	if (state.style !== interpolated) {
		setState({
			style: interpolated
		})
	}

	injectStyle(css, componentId)
}

const cleanProps = props => {
	const propKeys = Object.keys(props)
	const eventKeys = Object.keys(events)

	const filteredProps = propKeys.filter(propName => {
		const lowerCasePropName = propName.toLowerCase()
		const lowerCaseEventNames = eventKeys.map(e => e.toLowerCase())

		return htmlAttributes.includes(lowerCasePropName) || lowerCaseEventNames.includes(lowerCasePropName)
	})

	const cleanedProps = filteredProps.reduce((acc, propName) => {
		return {
			...acc,
			[propName]: props[propName]
		}
	}, {})

	return cleanedProps
}

const createStyledComponent = (elementName, strings, expressions, currentCount) => {
	const isStatic = expressions.length === 0
	const componentId = 'sc-' + hash('sc' + currentCount)

	return {
		isStatic,
		styledId: componentId,
		shouldUpdate: ({props, state}, nextProps, nextState) => !equal(props, nextProps) || !equal(state, nextState),
		afterMount: ({props, state}, el, setState) => evaluateAndInject(strings, expressions, props, state, componentId, setState, isStatic),
		afterUpdate: ({props, state}, prevProps, prevState, setState) => evaluateAndInject(strings, expressions, props, state, componentId, setState, isStatic),
		render: context => {
			const {props, state} = context
			const Element = elementName
			const isComponent = typeof Element !== 'string'
			const className = createClassName(componentId, state.style)
			const classes = [props.class, componentId, className]
				.filter(Boolean)
				.join(' ')

			const cleanedProps = isComponent ? props : cleanProps(props)

			return (
				<Element {...cleanedProps} class={classes}>
					{props.children}
				</Element>
			)
		}
	}
}

const styled = elementName => (strings, ...expressions) => {
	const currentCount = getInternalState('counter') + 1

	setInternalState({
		counter: currentCount
	})

	return createStyledComponent(elementName, strings, expressions, currentCount)
}

domElements.forEach(domElement => {
	styled[domElement] = styled(domElement)
})

export default styled
