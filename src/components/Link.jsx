import { navigate, shouldHandleClick } from '../lib/navigation.js';

const Link = ({ to, onClick, children, ...rest }) => {
  const handleClick = (event) => {
    onClick?.(event);
    if (!shouldHandleClick(event, to) || rest.target === '_blank') return;
    event.preventDefault();
    navigate(to);
  };

  return <a href={to} onClick={handleClick} {...rest}>{children}</a>;
};

export default Link;
