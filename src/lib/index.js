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

const interpolateTemplate = (strings, expressions, props) => {
	return strings
		.map((string, i) => {
			const expression = expressions[i]
			const functionExpression = typeof expression === 'function' && expression
			const objectExpression = typeof expression === 'object' && expression.styledComponentId && `.${expression.styledComponentId}`
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
}

const evaluateStyle = (strings, expressions, props, styledComponentId) => {
	const interpolated = interpolateTemplate(strings, expressions, props)
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

const getSelectors = style => style
	.replace(/({.+!?\.)|({.+})/gi, ' .')
	.split('.')
	.map(string => string.trim())
	.filter(Boolean)
	.map(selector => `.${selector}`)

const injectStyle = (style, styledComponentId) => {
	const className = createClassName(styledComponentId, style)
	const styleTag = getHeadStyleTag()
	const styleSheet = styleTag.sheet
	const rules = splitStyle(style)

	const ruleExists = Array.from(styleSheet.rules).find(rule => {
		const selectors = getSelectors(style)

		return selectors.includes(rule.selectorText)
	})

	if (style && !ruleExists) {
		rules.forEach(rule => styleSheet.insertRule(rule, 0))
	}
}

const evaluateAndInject = (strings, expressions, props, state, styledComponentId, setState, isStatic) => {
	if (isStatic && state.interpolated) {
		return false
	}

	const {css, interpolated} = evaluateStyle(strings, expressions, props, styledComponentId)

	if (state.interpolated !== interpolated) {
		setState({
			interpolated
		})
	}

	injectStyle(css, styledComponentId)

	return css
}

const getElementAttributes = props => {
	const propKeys = Object.keys(props)
	const eventNames = Object.keys(events)
		.map(e => e.toLowerCase())

	return propKeys
		.filter(_propName => {
			const propName = _propName.toLowerCase()

			return htmlAttributes.includes(propName) || eventNames.includes(propName)
		})
		.reduce((acc, propName) => {
			return {
				...acc,
				[propName]: props[propName]
			}
		}, {})
}

const createStyledComponent = (elementName, options, strings, expressions, currentCount) => {
	const Element = elementName
	const isComponent = typeof Element !== 'string'
	const isStatic = expressions.length === 0
	const styledComponentId = `${config.prefix}-${hash(config.prefix + currentCount)}`

	const StyledComponent = {
		styledComponentId,
		afterMount: ({props, state}, el, setState) => {
			evaluateAndInject(strings, expressions, props, state, styledComponentId, setState, isStatic)
		},
		shouldUpdate: ({props, state}, nextProps, nextState) => {
			if (props === nextProps && state === nextState) {
				return false
			}

			return !deepEqual(props, nextProps) || !deepEqual(state, nextState)
		},
		render: (context, setState) => {
			const {props, state} = context
			const className = createClassName(styledComponentId, state.interpolated)
			const propsClass = stringifyClasses(props.class)
			const propsOrAttributes = isComponent ? props : getElementAttributes(props)
			const classString = [propsClass, styledComponentId, className]
				.filter(Boolean)
				.join(' ')

			return (
				<Element {...propsOrAttributes} class={classString}>
					{props.children}
				</Element>
			)
		},
		afterUpdate: ({props, state}, prevProps, prevState, setState) => {
			evaluateAndInject(strings, expressions, props, state, styledComponentId, setState, isStatic)
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
