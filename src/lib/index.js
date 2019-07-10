import stylis from 'stylis'
import { deepEqual } from 'fast-equals'
import events from '../assets/events'
import htmlAttributes from '../assets/html-attributes'
import domElements from '../assets/dom-elements'
import config from './config'
import {
	createClassName,
	generateAlphabeticName,
	getInternalState,
	hash,
	setInternalState,
	stringifyClasses
} from './utils'

const evaluateStyle = (strings, expressions, props, styledComponentId) => {
	const handleFunctionExpression = functionExpression => {
		if (functionExpression === false) return false

		// might need a better way of solving this. functionExpression could be either 'props => props.someProp' or a nested component
		// nested component takes {props} and style expression takes {...props}
		// this is a compromise for now: {...props, props}
		const result = functionExpression({...props, props})

		if (typeof result === 'string') {
			return result
		}

		if (typeof result === 'object' && result.attributes.class) {
			return `.${result.attributes.class.split(/\s/).join('.')}`
		}

		return false
	}

	const interpolated = strings
		.map((string, i) => {
			const expression = expressions[i]
			const functionExpression = typeof expression === 'function' && expression
			const objectExpression = typeof expression === 'object' && `.${expression.styledComponentId}`
			const stringExpression = typeof expression === 'string' && expression

			const handledFunctionExpression = handleFunctionExpression(functionExpression)

			const handledExpression = (
				handledFunctionExpression ||
				objectExpression ||
				stringExpression ||
				''
			)

			return `${string}${handledExpression}`
		})
		.join('')

	const className = `.${createClassName(styledComponentId, interpolated)}`

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

const injectStyle = (style, styledComponentId) => {
	const className = createClassName(styledComponentId, style)
	const styleTag = getHeadStyleTag()
	const styleSheet = styleTag.sheet
	const rules = splitStyle(style)
	const ruleExists = Array.from(styleSheet.rules).find(rule => {
		const selectors = style
			.replace(/({.+!?\.)|({.+})/gi, ' .')
			.split('.')
			.map(string => string.trim())
			.filter(Boolean)
			.map(selector => `.${selector}`)

		return selectors.includes(rule.selectorText)
	})

	if (style && !ruleExists) {
		rules.forEach(rule => styleSheet.insertRule(rule, 0))
	}
}

const evaluateAndInject = (strings, expressions, props, state, styledComponentId, setState, isStatic) => {
	if (isStatic && state[config.stateScope]) {
		return false
	}

	const {css, interpolated} = evaluateStyle(strings, expressions, props, styledComponentId)

	if (state[config.stateScope] !== interpolated) {
		setState({
			[config.stateScope]: interpolated
		})
	}

	injectStyle(css, styledComponentId)

	return css
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

const createStyledComponent = (elementName, options, strings, expressions, currentCount) => {
	const Element = elementName
	const isComponent = typeof Element !== 'string'
	const isShorthandComponent = isComponent && typeof Element === 'function'
	const isObjectComponent = isComponent && typeof Element === 'object'
	const isStatic = expressions.length === 0
	const styledComponentId = `${config.prefix}-${hash(config.prefix + currentCount)}`

	const StyledComponent = {
		// Styled component object properties
		isStatic,
		isStyledWrapper: true,
		styledComponentId,

		// Component lifecycle hooks
		shouldUpdate: ({props, state}, nextProps, nextState) => {
			if (props === nextProps && state === nextState) {
				return false
			}

			return !deepEqual(props, nextProps) || !deepEqual(state, nextState)
		},
		afterMount: ({props, state}, el, setState) => {
			evaluateAndInject(strings, expressions, props, state, styledComponentId, setState, isStatic)
		},
		afterUpdate: ({props, state}, prevProps, prevState, setState) => {
			evaluateAndInject(strings, expressions, props, state, styledComponentId, setState, isStatic)
		},
		render: (context, setState) => {
			const {props, state} = context
			const className = createClassName(styledComponentId, state[config.stateScope])
			const propsClass = stringifyClasses(props.class)
			const classString = [propsClass, styledComponentId, className]
				.filter(Boolean)
				.join(' ')
			const cleanedProps = isComponent ? props : cleanProps(props)

			return (
				<Element {...cleanedProps} class={classString}>
					{props.children}
				</Element>
			)
		}
	}

	return StyledComponent
}

const defaultOptions = {}

const styled = (elementName, options = defaultOptions) => (strings, ...expressions) => {
	const currentCount = getInternalState('counter') + 1

	setInternalState({
		counter: currentCount
	})

	return createStyledComponent(elementName, options, strings, expressions, currentCount)
}

domElements.forEach(domElement => {
	styled[domElement] = styled(domElement)
})

export const cssProp = props => props.css && (
	(typeof props.css === 'function' && props.css(props)) ||
	(typeof props.css === 'string' && props.css)
)

export default styled
