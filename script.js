AOS.init();

let validData = [], invalidData = [];

function renderDatabaseList() {
    const dbText = document.getElementById("database_nama").value.trim();
    const names = dbText.split('\n').map(n => n.trim()).filter(n => n !== "");
    const listContainer = document.getElementById("database_list");
    listContainer.innerHTML = "";

    names.forEach(name => {
        const item = document.createElement("div");
        item.textContent = name;
        listContainer.appendChild(item);
    });

    filterDatabaseList();
}

function filterDatabaseList() {
    const searchValue = document.getElementById("search_database").value.trim().toLowerCase();
    const items = document.querySelectorAll("#database_list div");

    items.forEach(item => {
        if (item.textContent.toLowerCase().includes(searchValue)) {
            item.style.display = "block";
        } else {
            item.style.display = "none";
        }
    });
}

document.addEventListener("DOMContentLoaded", function () {
    renderDatabaseList();
});

function parseData() {
    const rawData = document.getElementById("data_input").value.trim();
    if (!rawData) { Swal.fire('Oops!', 'Data Input kosong!', 'warning'); return; }
    const lines = rawData.split("\n").filter(line => line.trim() !== "");
    const tbody = document.querySelector("#parsedTable tbody");
    tbody.innerHTML = "";

    const dbText = document.getElementById("database_nama").value.trim();
    const databaseNama = dbText.split('\n').map(n => n.trim()).filter(n => n !== "");

    lines.forEach((line, idx) => {
        let cols = line.includes('\t') ? line.split('\t') : (line.includes(',') ? line.split(',') : line.split(/\s+/));
        while (cols.length < 7) cols.push('');
        const row = document.createElement("tr");

        cols.forEach((cell, colIdx) => {
            const td = document.createElement("td");
            td.contentEditable = true;
            td.innerText = cell.trim();
            row.appendChild(td);

            if (colIdx === 0) {
                td.id = `nama-input-${idx}`;
                setTimeout(() => {
                    new autoComplete({
                        selector: `#nama-input-${idx}`,
                        placeHolder: "Cari nama...",
                        data: { src: databaseNama },
                        threshold: 0,
                        debounce: 100,
                        resultsList: { maxResults: 5 },
                        onSelection: (feedback) => {
                            td.innerText = feedback.selection.value;
                        }
                    });
                }, 50);
            }
        });

        tbody.appendChild(row);
    });

    document.getElementById("parsedTableContainer").style.display = "block";
}

function prosesValidasi() {
    const databaseNama = document.getElementById("database_nama").value.trim().split('\n').map(n => n.trim());
    const rows = document.querySelectorAll("#parsedTable tbody tr");
    validData = []; invalidData = [];

    rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll("td")).map(td => td.innerText.trim());
        const [nama, divisi, shift, jamMasuk, jamPulang, jamKerja, lembur] = cells;
        let jamIstirahat = 0;
        const lemburValue = parseFloat(lembur);
        jamIstirahat = (lemburValue > 1) ? 1 : 0;
        const jamMasukFormatted = formatTime(jamMasuk);
        const jamPulangFormatted = formatTime(jamPulang);

        if (databaseNama.includes(nama)) {
            validData.push([nama, jamMasukFormatted, jamPulangFormatted, jamIstirahat]);
        } else {
            invalidData.push([nama, jamMasukFormatted, jamPulangFormatted, jamIstirahat]);
        }
    });

    renderHasil();
}

function formatTime(jamString) {
    let totalJam = parseTime(jamString);
    let jam = Math.floor(totalJam);
    let menit = Math.round((totalJam - jam) * 60);
    if (menit === 60) {
        jam += 1;
        menit = 0;
    }
    return `${jam}:${menit.toString().padStart(2, '0')}`;
}

function parseTime(jamString) {
    if (jamString.includes(":")) {
        const [jam, menit] = jamString.split(":").map(v => parseInt(v));
        return jam + (menit / 60);
    } else {
        const value = parseFloat(jamString);
        const jam = Math.floor(value);
        const menit = Math.round((value - jam) * 100); 
        return jam + (menit / 60);
    }
}

function renderHasil() {
    document.getElementById("hasilContainer").style.display = "block";
    const validBody = document.getElementById("validTableBody");
    const invalidBody = document.getElementById("invalidTableBody");

    validBody.innerHTML = "";
    validData.forEach(row => {
        const tr = document.createElement("tr");
        row.forEach(cell => { const td = document.createElement("td"); td.innerText = cell; tr.appendChild(td); });
        validBody.appendChild(tr);
    });

    invalidBody.innerHTML = "";
    invalidData.forEach(row => {
        const tr = document.createElement("tr");
        row.forEach(cell => { const td = document.createElement("td"); td.innerText = cell; tr.appendChild(td); });
        invalidBody.appendChild(tr);
    });

    Swal.fire('Sukses!', 'Data berhasil diproses.', 'success');
}

function exportExcel() {
    showLoader(); 
    try {
        const wb = XLSX.utils.book_new();
        const wsValid = XLSX.utils.aoa_to_sheet([["Nama", "Masuk", "Pulang", "Istirahat"], ...validData]);
        XLSX.utils.book_append_sheet(wb, wsValid, "Valid");

        const wsInvalid = XLSX.utils.aoa_to_sheet([["Nama", "Masuk", "Pulang", "Istirahat"], ...invalidData]);
        XLSX.utils.book_append_sheet(wb, wsInvalid, "Invalid");

        XLSX.writeFile(wb, "RekapLembur.xlsx");
    } catch (error) {
        Swal.fire('Gagal!', 'Terjadi error saat export Excel: ' + error, 'error');
    } finally {
        hideLoader(); 
    }
}

function exportGoogleSheets() {
    showLoader(); 

    const url = "https://script.google.com/macros/s/AKfycbxZltW_nIF7UqUIdht-xTLobb5_FnulScBDsYIuCdKktPFaK3pXw_tddVV7garIFn1qJw/exec";
    
    const formData = new URLSearchParams();
    formData.append("valid", JSON.stringify(validData));
    formData.append("invalid", JSON.stringify(invalidData));

    fetch(url, {
        method: "POST",
        body: formData
    })
    .then(res => res.json())
    .then(res => {
        if (res.result === "success") {
            Swal.fire('Sukses!', 'Data berhasil dikirim ke Google Sheets.', 'success');
        } else {
            Swal.fire('Gagal!', 'Error dari server: ' + res.message, 'error');
        }
    })
    .catch(err => {
        Swal.fire('Gagal!', 'Terjadi error: ' + err, 'error');
    })
    .finally(() => {
        hideLoader();
    });
}

function showLoader() {
    const loader = document.getElementById('loader');
    loader.style.display = 'flex';
}

function hideLoader() {
    const loader = document.getElementById('loader');
    loader.style.display = 'none';
}
