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

function hasHeaderDuplicated(array) {
  const duplicated = []
  array.filter(function (element, index) {
    if (array.indexOf(element) !== index) {
      duplicated.push(element)
    }
  })
  return duplicated
}

function isInvalidPhoneString(string) {
  if (string === "" || string.length < 7) {
    return true
  }
  const regex = new RegExp("[a-zA-z]")
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
      const removeDuplicatedValues = [...new Set([...acumulator[acumulatorProps], ...element[acumulatorProps],])]
      tempObj[acumulatorProps] = removeDuplicatedValues
    }
  }
  return tempObj
}

try {
  const json = []
  const dataDiscarted = []
  const jsonAdjusted = []
  const objHeaderDuplicated = {}
  const objEmail = {}
  const objPhone = {}

  const file = fs.readFileSync("input.csv", "utf8").replace(/[\r]/g, "")
  const splitedLines = file.split("\n")
  const header = splitedLines[0].replace(/"/g, "").split(",")
  const normalizeLines = (element) => normalizeSeparator(element).replace(/"/g, "")
  const normalizedLines = splitedLines.map(normalizeLines)
  const elementsHeaderDuplicated = hasHeaderDuplicated(header)

  for (keyDuplicated of elementsHeaderDuplicated) {
    objHeaderDuplicated[keyDuplicated] = []
  }

  //Iterate take lines
  for (let i = 1; i < normalizedLines.length; i++) {
    let currentLine = normalizedLines[i].split(",")
    const objGeneral = {}
    objEmail.addresses = []
    objPhone.addresses = []

    //Iterate take columns
    for (let j = 0; j < header.length; j++) {
      //Filter and adjust columns rapeated for an array
      const keyFilter = Object.keys(objHeaderDuplicated).filter(
        (element) => element == header[j]
      )
      if (
        !(Object.keys(objHeaderDuplicated).length === 0) &&
        keyFilter == header[j]
      ) {
        if (currentLine[j] == "") {
          dataDiscarted.push({eid: currentLine[header.indexOf("eid")],[header[j]]: currentLine[j].trim(),})
        } else {
          const adjustmentHeaderArray = currentLine[j].split("/")

          //Populate repeated header in an array
          for (headerValue of adjustmentHeaderArray) {
            objHeaderDuplicated[keyFilter].push(headerValue.trim())
          }
        }

      //Filter address types email
      } else if (
        !(currentLine[j].indexOf("@") == -1) &&
        !(currentLine[j].indexOf(".") == -1)
      ) {
        const quantityOfEmails = currentLine[j].match(
          new RegExp("@", "g")
        ).length
        if (quantityOfEmails >= 1) {
          const adjustmentEmailArray = currentLine[j].split(/[ /]/)
          const adjustmentEmailArrayLength = adjustmentEmailArray.length

          //Remove non emails
          if (adjustmentEmailArrayLength > quantityOfEmails) {
            const quantityOfNonEmails = adjustmentEmailArrayLength - quantityOfEmails
            for (let k = 0; k < adjustmentEmailArrayLength; k++) {
              if (adjustmentEmailArray[k].indexOf("@") == -1) {
                adjustmentEmailArray.splice(k, quantityOfNonEmails)
              }
            }
          }

          //Populate object email addresses
          for (emailValue of adjustmentEmailArray) {
            const tagGenerator = header[j].split(" ")
            for (let k = 0; k < tagGenerator.length; k++) {
              if (tagGenerator[k] == "email") {
                tagGenerator.splice(k, 1)
              }
            }
            objEmail.addresses.push({
              type: "email",
              tags: tagGenerator,
              address: emailValue.trim(),
            })
          }
        }

      //Filter address types phone
      } else if (!isInvalidPhoneString(currentLine[j])) {
        if (isValidBRPhone(currentLine[j])) {
          const tagGenerator = header[j].split(" ")
          for (let k = 0; k < tagGenerator.length; k++) {
            if (tagGenerator[k] == "phone") {
              tagGenerator.splice(k, 1)
            }
          }
          objPhone.addresses.push({
            type: "phone",
            tags: tagGenerator,
            address: getAbsolutePhone(currentLine[j].trim()),
          })
        }

      //Filter invisible field
      } else if (header[j].includes("invisible")) {
        if (typeof currentLine[j] === "string") {
          let validationYesOrNo = false
          currentLine[j] == "yes"
            ? (validationYesOrNo = true)
            : currentLine[j] == "y"
            ? (validationYesOrNo = true)
            : currentLine[j] == "1"
            ? (validationYesOrNo = true)
            : (validationYesOrNo = false)
          objGeneral[header[j]] = validationYesOrNo
        }

      //Filter see_all field
      } else if (header[j].includes("see_all")) {
        if (typeof currentLine[j] === "string") {
          let validationYesOrNo = false
          currentLine[j] == "yes"
            ? (validationYesOrNo = true)
            : currentLine[j] == "y"
            ? (validationYesOrNo = true)
            : currentLine[j] == "1"
            ? (validationYesOrNo = true)
            : (validationYesOrNo = false)
          objGeneral[header[j]] = validationYesOrNo
        }

      //Data abnormal discarted use for show the user check if lost important data and adjust if necessary
      } else if (
        currentLine[j].trim() === "" ||
        header[j].includes("phone") ||
        header[j].includes("email")
      ) {
        dataDiscarted.push({
          eid: currentLine[header.indexOf("eid")],
          [header[j]]: currentLine[j].trim(),
        })
      } else {
        objGeneral[header[j]] = currentLine[j].trim()
      }
    }

    //Assign header obj and clean
    for (assignHeaderObj in objHeaderDuplicated) {
      objGeneral[assignHeaderObj] = objHeaderDuplicated[assignHeaderObj]
      objHeaderDuplicated[assignHeaderObj] = []
    }

    //Assign email addresses and clean
    objGeneral.addresses = []
    for (objOfAdresses of objEmail.addresses) {
      objGeneral.addresses.push(objOfAdresses)
      objEmail.addresses = []
    }

    //Assign phone addresses and clean
    for (objOfAdresses of objPhone.addresses) {
      objGeneral.addresses.push(objOfAdresses)
      objPhone.addresses = []
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
  console.error(`Proccess failed, try again. Error: ${err}`)
}

//In Output1.json example not consider two emails typed in the field "email Parent" for person eid 1222
