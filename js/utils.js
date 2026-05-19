// Timer utility functions

function hours(t) { return floor(t / 3600); }
function minutes(t) { return floor((t % 3600) / 60); }
function seconds(t) { return t % 60; }
