import 'inobounce'; // prevent bouncing on mobile
import './main.global.css'; // bypass css modules
import routes from './routes'; // assigns components to routes

// hide the navigation bar on mobile
window.scrollTo(0, 1);

// pack react mode takes it from here
export default routes;
