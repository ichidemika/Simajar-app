// ==========================================
// KONFIGURASI ID (SESUAIKAN DENGAN MILIK ANDA)
// ==========================================
const SPREADSHEET_ID = "135B2-lZXICruH5Bh0wkGLF8yGeaMj_PtR5HHA4Nz6gQ"; 
const DRIVE_FOLDER_ID = "1_pEAg5kRI74oa3XMHnDKUEdxKlrsoR-U"; 

// ==========================================
// FUNGSI UTAMA WEB APP
// ==========================================
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('SIMAJAR - Sistem Jurnal Mengajar')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ==========================================
// API / DATABASE FUNCTIONS
// ==========================================

// 1. Ambil Statistik untuk Dashboard
function getDashboardStats() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Hitung Siswa
  const sheetSiswa = ss.getSheetByName("DataSiswa");
  const jmlSiswa = sheetSiswa ? sheetSiswa.getLastRow() - 1 : 0; // -1 Header
  
  // Hitung Guru
  const sheetGuru = ss.getSheetByName("DataGuru");
  const jmlGuru = sheetGuru ? sheetGuru.getLastRow() - 1 : 0;
  
  // Hitung Jurnal Hari Ini
  const sheetJurnal = ss.getSheetByName("Jurnal");
  let jmlJurnal = 0;
  if(sheetJurnal) {
    const data = sheetJurnal.getDataRange().getValues();
    const today = new Date().toDateString();
    // Loop cek tanggal (misal kolom 0 adalah tanggal)
    for(let i=1; i<data.length; i++){
      if(new Date(data[i][0]).toDateString() === today) jmlJurnal++;
    }
  }

  // Hitung Absensi Hari Ini
  const sheetAbsen = ss.getSheetByName("Absensi");
  let jmlHadir = 0;
  if(sheetAbsen) {
    const data = sheetAbsen.getDataRange().getValues();
    const today = new Date().toDateString();
    for(let i=1; i<data.length; i++){
      // Asumsi: Kolom 0 Tanggal, Kolom 3 Status
      if(new Date(data[i][0]).toDateString() === today && data[i][3] == "Hadir") {
        jmlHadir++;
      }
    }
  }

  return {
    siswa: Math.max(0, jmlSiswa),
    guru: Math.max(0, jmlGuru),
    jurnal: jmlJurnal,
    hadir: jmlHadir
  };
}

// 2. Fungsi Login
function loginUser(username, password) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("DataGuru");
  const data = sheet.getDataRange().getValues();
  
  // Asumsi: Kolom B=Username, Kolom C=Password, Kolom A=Nama, Kolom D=Jabatan, Kolom E=NIP, Kolom F=Foto
  // Sesuaikan index array dengan struktur sheet Anda (A=0, B=1, dst)
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] == username && data[i][2] == password) {
      return { 
        status: "SUCCESS", 
        data: {
          id: data[i][1], // Username sebagai ID
          nama: data[i][0],
          jabatan: data[i][3] || "Guru",
          nip: data[i][4] || "-",
          foto: data[i][5] || "https://via.placeholder.com/100"
        } 
      };
    }
  }
  return { status: "FAILED" };
}

// 3. Update Profil & Upload Foto
function updateUserProfile(userId, newPassword, photoData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("DataGuru");
  const data = sheet.getDataRange().getValues();
  
  let rowIndex = -1;
  // Cari baris user berdasarkan Username (Kolom B / Index 1)
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] == userId) { 
      rowIndex = i + 1; 
      break;
    }
  }
  
  if (rowIndex === -1) return { sukses: false, pesan: "User tidak ditemukan." };
  
  try {
    // Update Password (Kolom C / Index 3)
    if (newPassword && newPassword !== "") {
      sheet.getRange(rowIndex, 3).setValue(newPassword);
    }
    
    // Upload Foto
    if (photoData) {
      const blob = Utilities.newBlob(Utilities.base64Decode(photoData.bytes), photoData.mimeType, photoData.name);
      const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      const fotoUrl = "https://drive.google.com/uc?export=view&id=" + file.getId();
      
      // Simpan URL ke Kolom F (Index 6)
      sheet.getRange(rowIndex, 6).setValue(fotoUrl);
    }
    return { sukses: true };
  } catch (e) {
    return { sukses: false, pesan: e.toString() };
  }
}