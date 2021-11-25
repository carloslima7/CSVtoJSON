const fs = require("fs")
const _ = require("lodash")
const phoneUtil = require("google-libphonenumber").PhoneNumberUtil.getInstance()

function normalizeSeparator(string) {
  const regex = /(".+),(.+")/
  if (regex.test(string) == false) {
    return string
  }
  const replacement = string.replace(regex, "$1/$2")
  return normalizeSeparator(replacement)
}

function getHeaderDuplicated(array) {
  const duplicated = array.filter(function (element, index) {
    return array.indexOf(element) !== index
  })
  return duplicated
}

function isInvalidPhoneString(string) {
  if (string === "" || string.length < 7) {
    return true
  }
  const regex = /[a-zA-z]/
  return regex.test(string)
}

function isValidBRPhone(string) {
  const number = phoneUtil.parseAndKeepRawInput(string, "BR")
  return phoneUtil.isValidNumberForRegion(number, "BR")
}

function getAbsolutePhone(string) {
  const number = phoneUtil.parseAndKeepRawInput(string, "BR")
  const absolutNumber = `${number.getCountryCode()}${number.getNationalNumber()}`
  return absolutNumber
}

function mergeData(acumulator, element) {
  const tempObj = {}
  for (acumulatorProps in acumulator) {
    if (acumulator[acumulatorProps] === element[acumulatorProps]) {
      tempObj[acumulatorProps] = element[acumulatorProps]
    } else {
      const removeDuplicatedValues = [
        ...new Set([
          ...acumulator[acumulatorProps],
          ...element[acumulatorProps],
        ]),
      ]
      tempObj[acumulatorProps] = removeDuplicatedValues
    }
  }
  return tempObj
}

function isValidParameter(string) {
  const conditions = {
    yes: true,
    y: true,
    1: true,
  }
  return conditions[string] || false
}

try {
  const json = []
  const dataDiscarted = []
  const jsonAdjusted = []
  const objHeaderDuplicated = {}
  const objAddresses = {}

  const file = fs.readFileSync("input.csv", "utf8").replace(/[\r]/g, "")
  const splitedLines = file.split("\n")
  const header = splitedLines[0].replace(/"/g, "").split(",")
  const normalizeLines = (element) => normalizeSeparator(element).replace(/"/g, "")
  const normalizedLines = splitedLines.map(normalizeLines)
  const elementsHeaderDuplicated = getHeaderDuplicated(header)

  for (keyDuplicated of elementsHeaderDuplicated) {
    objHeaderDuplicated[keyDuplicated] = []
  }

  //Iterate take lines
  for (let i = 1; i < normalizedLines.length; i++) {
    let currentLine = normalizedLines[i].split(",")
    const objGeneral = {}
    objAddresses.addreses = []

    //Iterate take columns
    for (let j = 0; j < header.length; j++) {
      const columnName = header[j]
      const cellValue = currentLine[j]

      //Filter and adjust columns rapeated
      const keyFilter = Object.keys(objHeaderDuplicated).filter(
        (element) => element == columnName
      )
      if (!(Object.keys(objHeaderDuplicated).length === 0) && keyFilter == columnName) {
        if (cellValue == "") {
          dataDiscarted.push({
            eid: currentLine[header.indexOf("eid")],
            [columnName]: cellValue.trim(),
          })
        } else {
          const adjustmentHeaderArray = cellValue.split("/")

          //Populate repeated header
          for (headerValue of adjustmentHeaderArray) {
            objHeaderDuplicated[keyFilter].push(headerValue.trim())
          }
        }

        //Filter addres types email
      } else if (!(cellValue.indexOf("@") == -1) && !(cellValue.indexOf(".") == -1)) {
        const quantityOfEmails = cellValue.match(/@/g).length
        if (quantityOfEmails >= 1) {
          const adjustmentEmailArray = cellValue.split(/[ /]/)
          const adjustmentEmailArrayLength = adjustmentEmailArray.length

          //Remove non emails
          if (adjustmentEmailArrayLength > quantityOfEmails) {
            const quantityOfNonEmails =
              adjustmentEmailArrayLength - quantityOfEmails
            for (let k = 0; k < adjustmentEmailArrayLength; k++) {
              if (adjustmentEmailArray[k].indexOf("@") == -1) {
                adjustmentEmailArray.splice(k, quantityOfNonEmails)
              }
            }
          }

          //Populate object email addreses
          for (emailValue of adjustmentEmailArray) {
            const tagGenerator = columnName.split(" ")
            for (let k = 0; k < tagGenerator.length; k++) {
              if (tagGenerator[k] == "email") {
                tagGenerator.splice(k, 1)
              }
            }
            objAddresses.addreses.push({
              type: "email",
              tags: tagGenerator,
              addres: emailValue.trim(),
            })
          }
        }

        //Filter addres types phone
      } else if (!isInvalidPhoneString(cellValue)) {
        if (isValidBRPhone(cellValue)) {
          const tagGenerator = columnName.split(" ")
          for (let k = 0; k < tagGenerator.length; k++) {
            if (tagGenerator[k] == "phone") {
              tagGenerator.splice(k, 1)
            }
          }
          objAddresses.addreses.push({
            type: "phone",
            tags: tagGenerator,
            addres: getAbsolutePhone(cellValue.trim()),
          })
        }

        //Filter invisible field
      } else if (columnName.includes("invisible")) {
        if (typeof cellValue === "string") {
          objGeneral[columnName] = isValidParameter(cellValue.toLowerCase())
        }

        //Filter see_all field
      } else if (columnName.includes("see_all")) {
        if (typeof cellValue === "string") {
          objGeneral[columnName] = isValidParameter(cellValue.toLowerCase())
        }

        //Data abnormal discarted use for show the user check if lost important data and adjust if necesary
      } else if (cellValue.trim() === "" || /phone|email/.test(columnName)) {
        dataDiscarted.push({
          eid: currentLine[header.indexOf("eid")],
          [columnName]: cellValue.trim(),
        })
      } else {
        objGeneral[columnName] = cellValue.trim()
      }
    }

    //Asign header obj and clean
    for (asignHeaderObj in objHeaderDuplicated) {
      objGeneral[asignHeaderObj] = objHeaderDuplicated[asignHeaderObj]
      objHeaderDuplicated[asignHeaderObj] = []
    }

    //Asign email and phone addreses and clean
    objGeneral.addreses = []
    for (objOfAdreses of objAddresses.addreses) {
      objGeneral.addreses.push(objOfAdreses)
      objAddresses.addreses = []
    }

    json.push(objGeneral)
  }

  //Group by for eid
  const agroupSameEid = _.groupBy(json, "eid")

  //Merge data the same person
  for (uniquePerson in agroupSameEid) {
    jsonAdjusted.push(agroupSameEid[uniquePerson].reduce(mergeData))
  }

  //Write in file with parse to JSON
  fs.writeFileSync("output.json", JSON.stringify(jsonAdjusted, null, 4))
} catch (err) {
  console.error(`Procces failed, try again. Error: ${err}`)
}

//In Output1.json example not consider two emails typed in the field "email Parent" for person eid 1222
