// --- CONFIGURATION ---
const SPREADSHEET_ID = "1XabN7C0YjT270WChaC1mJRomaAyghMSvcyWNS5YXmKo";
const DRIVE_FOLDER_ID = "1jQIWqzcCGcrkZx_wB1mScl7RhpaHR6Bv";

// --- SPREADSHEET SETUP ---
const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
const adminSheet = ss.getSheetByName("Admin-Info");
const categoriesSheet = ss.getSheetByName("Categories");

// --- WEB APP ENTRY POINT ---
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    let result;
    switch (payload.action) {
      case 'login':
        result = login(payload.params.username, payload.params.password);
        break;
      case 'getWebsites':
        result = getWebsites(payload.params.page, payload.params.limit, payload.params.category);
        break;
      case 'getAdminDashboardStats':
        result = getAdminDashboardStats();
        break;
      case 'getAllWebsites':
        result = getAllWebsites();
        break;
      case 'getWebsiteDetails':
        result = getWebsiteDetails(payload.params.id, payload.params.category);
        break;
      case 'addWebsite':
        result = addWebsite(payload.params.entry);
        break;
      case 'updateWebsite':
        result = updateWebsite(payload.params.entry);
        break;
      case 'deleteWebsite':
        result = deleteWebsite(payload.params.id, payload.params.category);
        break;
      case 'getCategories':
        result = getCategories();
        break;
      case 'addCategory':
        result = addCategory(payload.params.categoryName);
        break;
      case 'editCategory':
        result = editCategory(payload.params.oldName, payload.params.newName);
        break;
      case 'deleteCategory':
        result = deleteCategory(payload.params.categoryName);
        break;
      default:
        result = { success: false, message: 'Invalid action.' };
    }
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON)
      .withHeaders({ 'Access-Control-Allow-Origin': '*' });
  } catch (error) {
    Logger.log(error.toString());
    const errorResult = { success: false, message: 'API Error: ' + error.toString() };
    return ContentService.createTextOutput(JSON.stringify(errorResult))
      .setMimeType(ContentService.MimeType.JSON)
      .withHeaders({ 'Access-Control-Allow-Origin': '*' });
  }
}

// --- HELPER FUNCTIONS ---
function getNextId(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 1;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat().map(Number);
  return Math.max(0, ...ids) + 1;
}

function findRow(sheet, value, col = 1) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][col - 1].toString().trim() == value.toString().trim()) {
      return { row: data[i], index: i + 1 };
    }
  }
  return null;
}

function uploadImageToDrive(base64Data, fileName) {
  try {
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const splitData = base64Data.split(",");
    const contentType = splitData[0].match(/:(.*?);/)[1];
    const decodedData = Utilities.base64Decode(splitData[1]);
    const blob = Utilities.newBlob(decodedData, contentType, fileName);
    
    const file = folder.createFile(blob);
    return "https://drive.google.com/uc?id=" + file.getId();
    
  } catch (e) {
    Logger.log("Error uploading to drive: " + e.toString());
    return null;
  }
}

// --- CORE LOGIC FUNCTIONS ---
function login(username, password) {
  const found = findRow(adminSheet, username, 1);
  if (found && found.row[1].toString() === password.toString()) {
    return { success: true };
  }
  return { success: false, message: "Invalid credentials." };
}

function getWebsites(page = 1, limit = 20, category = "All") {
  let allWebsites = [];
  const categoriesData = getCategories().map(catObj => catObj.name);
  const sheetsToRead = category === "All" ? categoriesData : [category];

  sheetsToRead.forEach(cat => {
    const sheet = ss.getSheetByName(cat);
    if (sheet && sheet.getLastRow() > 1) {
      const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getDisplayValues();
      data.forEach(row => {
        if (row[2] && row[6] && row[7]) {
          const entryDate = new Date(row[6] + ' ' + row[7]);
          if (!isNaN(entryDate.getTime())) {
            allWebsites.push({
              id: row[0],
              image: row[1],
              name: row[2],
              description: row[3],
              url: row[4],
              category: row[5],
              date_added: entryDate.toISOString()
            });
          }
        }
      });
    }
  });

  allWebsites.sort((a, b) => new Date(b.date_added) - new Date(a.date_added));

  const totalPages = Math.ceil(allWebsites.length / limit);
  const startIndex = (page - 1) * limit;
  const paginatedWebsites = allWebsites.slice(startIndex, startIndex + limit);
  return { websites: paginatedWebsites, totalPages: totalPages };
}

function getAdminDashboardStats() {
  const categories = getCategories().map(catObj => catObj.name);
  let totalSites = 0;
  let newSites = 0;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  categories.forEach(cat => {
    const sheet = ss.getSheetByName(cat);
    if (sheet) {
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        totalSites += lastRow - 1;
        const dates = sheet.getRange(2, 7, lastRow - 1, 2).getDisplayValues();
        dates.forEach(row => {
          if (row[0] && row[1]) {
            const entryDate = new Date(row[0] + ' ' + row[1]);
            if (!isNaN(entryDate.getTime()) && entryDate >= sevenDaysAgo) {
              newSites++;
            }
          }
        });
      }
    }
  });
  return { totalSites, newSites, totalCategories: categories.length };
}

function getAllWebsites() {
  let allWebsites = [];
  getCategories().map(catObj => catObj.name).forEach(cat => {
    const sheet = ss.getSheetByName(cat);
    if (sheet && sheet.getLastRow() > 1) {
      const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getDisplayValues();
      data.forEach(row => {
        if (row[2] && row[6] && row[7]) {
          const entryDate = new Date(row[6] + ' ' + row[7]);
          if (!isNaN(entryDate.getTime())) {
            allWebsites.push({
              id: row[0],
              image: row[1],
              name: row[2],
              description: row[3],
              url: row[4],
              category: row[5],
              date_added: entryDate.toISOString()
            });
          }
        }
      });
    }
  });
  return allWebsites.sort((a, b) => new Date(b.date_added) - new Date(a.date_added));
}

function getWebsiteDetails(id, category) {
  const sheet = ss.getSheetByName(category);
  if (!sheet) return { success: false, message: "Sheet not found" };
  const found = findRow(sheet, id, 1);
  if (found) {
    return { success: true, description: found.row[3] };
  }
  return { success: false, message: "Website not found" };
}

function addWebsite(entry) {
  const sheet = ss.getSheetByName(entry.category);
  if (!sheet) return { success: false, message: "Category sheet not found." };
  
  let imageUrl = "";
  if (entry.imageBase64) {
    const uniqueFileName = new Date().getTime() + "-" + entry.name.replace(/\s+/g, '-');
    imageUrl = uploadImageToDrive(entry.imageBase64, uniqueFileName);
    if (!imageUrl) {
      return { success: false, message: "Could not upload image to Google Drive." };
    }
  }

  const newId = getNextId(sheet);
  const now = new Date();
  const date = Utilities.formatDate(now, Session.getScriptTimeZone(), "MM/dd/yyyy");
  const time = Utilities.formatDate(now, Session.getScriptTimeZone(), "HH:mm:ss");
  
  sheet.appendRow([newId, imageUrl, entry.name, entry.description, entry.url, entry.category, date, time]);
  return { success: true };
}

function updateWebsite(entry) {
  const oldSheet = ss.getSheetByName(entry.originalCategory);
  if (!oldSheet) return { success: false, message: "Original category sheet not found." };

  const found = findRow(oldSheet, entry.id, 1);
  if (!found) return { success: false, message: "Entry not found for update." };

  let imageUrl = found.row[1]; 

  if (entry.imageBase64 && entry.imageBase64.startsWith("data:image")) {
    
    const oldImageUrl = found.row[1];
    if (oldImageUrl && oldImageUrl.includes("drive.google.com")) {
      try {
        const fileId = oldImageUrl.split("id=")[1];
        if (fileId) {
          DriveApp.getFileById(fileId).setTrashed(true);
          Logger.log("Old image deleted: " + fileId);
        }
      } catch (e) {
        Logger.log("Could not delete old image. Error: " + e.toString());
      }
    }
    
    const uniqueFileName = new Date().getTime() + "-" + entry.name.replace(/\s+/g, '-');
    imageUrl = uploadImageToDrive(entry.imageBase64, uniqueFileName);
    if (!imageUrl) {
      return { success: false, message: "Could not upload new image to Google Drive." };
    }
  }

  const now = new Date();
  const date = Utilities.formatDate(now, Session.getScriptTimeZone(), "MM/dd/yyyy");
  const time = Utilities.formatDate(now, Session.getScriptTimeZone(), "HH:mm:ss");

  if (entry.originalCategory === entry.newCategory) {
    oldSheet.getRange(found.index, 2, 1, 4).setValues([[imageUrl, entry.name, entry.description, entry.url]]);
    oldSheet.getRange(found.index, 7, 1, 2).setValues([[date, time]]);
  } else {
    const newSheet = ss.getSheetByName(entry.newCategory);
    if (!newSheet) return { success: false, message: "New category sheet not found." };
    const newId = getNextId(newSheet);
    newSheet.appendRow([newId, imageUrl, entry.name, entry.description, entry.url, entry.newCategory, date, time]);
    oldSheet.deleteRow(found.index);
  }
  return { success: true };
}

function deleteWebsite(id, category) {
  const sheet = ss.getSheetByName(category);
  if (!sheet) return { success: false, message: "Category sheet not found." };
  const found = findRow(sheet, id, 1);
  if (found) {
    sheet.deleteRow(found.index);
    return { success: true };
  }
  return { success: false, message: "Entry not found for deletion." };
}

function getCategories() {
  if (categoriesSheet.getLastRow() < 2) return [];

  const data = categoriesSheet.getRange(2, 2, categoriesSheet.getLastRow() - 1, 3).getValues();

  const categoriesWithTimestamp = data.map(row => {
    if (row[0]) {
      return {
        name: row[0],
        date: row[1] ? Utilities.formatDate(new Date(row[1]), Session.getScriptTimeZone(), "MM/dd/yyyy") : null,
        time: row[2] ? Utilities.formatDate(new Date(row[2]), Session.getScriptTimeZone(), "HH:mm:ss") : null
      };
    }
  }).filter(Boolean);

  return categoriesWithTimestamp;
}

function addCategory(categoryName) {
  const existingCategories = getCategories().map(c => c.name.toLowerCase());
  if (existingCategories.includes(categoryName.toLowerCase())) {
    return { success: false, message: "Category already exists." };
  }

  const masterSheet = ss.getSheetByName("Master_Template");
  if (!masterSheet) {
    return { success: false, message: "Error: 'Master_Template' sheet not found. Please create and format it first." };
  }

  const newId = getNextId(categoriesSheet);
  const now = new Date();
  const date = Utilities.formatDate(now, Session.getScriptTimeZone(), "MM/dd/yyyy");
  const time = Utilities.formatDate(now, Session.getScriptTimeZone(), "HH:mm:ss");
  categoriesSheet.appendRow([newId, categoryName, date, time]);

  const newSheet = masterSheet.copyTo(ss);

  newSheet.setName(categoryName);
  newSheet.showSheet();
  ss.setActiveSheet(newSheet);

  return { success: true };
}

function editCategory(oldName, newName) {
  const sheetToRename = ss.getSheetByName(oldName);
  if (!sheetToRename) return { success: false, message: "Category sheet not found." };

  sheetToRename.setName(newName);

  const foundInList = findRow(categoriesSheet, oldName, 2);
  if (foundInList) {
    const now = new Date();
    const date = Utilities.formatDate(now, Session.getScriptTimeZone(), "MM/dd/yyyy");
    const time = Utilities.formatDate(now, Session.getScriptTimeZone(), "HH:mm:ss");
    categoriesSheet.getRange(foundInList.index, 2, 1, 3).setValues([[newName, date, time]]);
  }

  if (sheetToRename.getLastRow() > 1) {
    const range = sheetToRename.getRange(2, 6, sheetToRename.getLastRow() - 1, 1);
    const values = range.getValues().map(() => [newName]);
    range.setValues(values);
  }
  return { success: true };
}

function deleteCategory(categoryName) {
  const sheetToDelete = ss.getSheetByName(categoryName);
  if (sheetToDelete) ss.deleteSheet(sheetToDelete);

  const foundInList = findRow(categoriesSheet, categoryName, 2);
  if (foundInList) {
    categoriesSheet.deleteRow(foundInList.index);
    return { success: true };
  }
  return { success: false, message: "Category not found in the list." };
}