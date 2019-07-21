# styled-deku-components

styled-components, but for Deku 1.x.x

# Usage

```javascript
const PlainInput = ({props}) => <input class={props.class} type='text' value={props.value}/>

const Input = styled(PlainInput)`
	color: ${props => props.color};
  background: ${props => props.background};
`;

const Wrapper = styled.div`
  height: 100%;

  ${Input} {
    font-family: Helvetica Neue;
    letter-spacing: 0.5px;
  }
`;

const Heading = styled.h1`
  font-size: 20px;
  color: blue;
  font-family: Helvetica Neue;
`;

const render = () => {
  return (
    <Wrapper>
      <Heading>Hello world!</Heading>
      <Input color='red' background='black'/>
      <Input color='blue'/>
      <Input color='green'/>
    </Wrapper>
  )
}

export default { render }

```
