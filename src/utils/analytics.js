import ReactGA from "react-ga4";

export const initGA = () => {
    const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    if (measurementId) {
        ReactGA.initialize(measurementId);
        console.log("Google Analytics initialized with ID:", measurementId);
    } else {
        console.warn("Google Analytics Measurement ID (VITE_GA_MEASUREMENT_ID) not found in env.");
    }
};

export const pageView = (path) => {
    ReactGA.send({
        hitType: "pageview",
        page: path,
    });
};

export const event = (category, action, label = "") => {
    ReactGA.event({
        category,
        action,
        label,
    });
};