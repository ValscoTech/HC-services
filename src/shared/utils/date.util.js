const convertDateFormat = (originalDate) => {
  if (!originalDate) return "";

  const dateFormats = [
    /(\d{1,2})(st|nd|rd|th)\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i,
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
  ];

  for (const format of dateFormats) {
    const match = originalDate.match(format);
    if (match) {
      let day, month, year;

      if (match.length === 5) {
        day = match[1].padStart(2, "0");
        const monthNames = {
          January: "01",
          February: "02",
          March: "03",
          April: "04",
          May: "05",
          June: "06",
          July: "07",
          August: "08",
          September: "09",
          October: "10",
          November: "11",
          December: "12",
        };
        month =
          monthNames[
            match[3].charAt(0).toUpperCase() + match[3].slice(1).toLowerCase()
          ];
        year = match[4];
      } else {
        day = match[1].padStart(2, "0");
        month = match[2].padStart(2, "0");
        year = match[3];
      }

      return `${day}/${month}/${year}`;
    }
  }

  return originalDate;
};

function convertHyphenToSlash(originalDate) {
  if (!originalDate) return "";

  const datePattern = /^\d{2}-\d{2}-\d{4}$/;
  if (!datePattern.test(originalDate)) {
    return originalDate;
  }

  return originalDate.replace(/-/g, "/");
}

module.exports = {
  convertDateFormat,
  convertHyphenToSlash,
};
