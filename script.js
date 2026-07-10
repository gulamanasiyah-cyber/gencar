const fs = require('fs');
let content = fs.readFileSync('app/(dashboard)/profile/page.tsx', 'utf8');

function replaceAll(target, search, replacement) {
  return target.split(search).join(replacement);
}

// 1. ProfileData interface
content = replaceAll(content, 'role?: string;', `role?: string;
  timGambuhId?: string;
  timGambuhDaerahId?: number;
  timGambuhDesaId?: number;
  timGambuhKelompokId?: number;
  timGambuhDaerahNama?: string;
  timGambuhDesaNama?: string;
  timGambuhKelompokNama?: string;
  timGambuhTipe?: string;`);

// 2. editForm initial state
content = content.replace(/foto: "",\r?\n\s*}\);/, `foto: "",
    tgDaerahId: "",
    tgDesaId: "",
    timGambuhDaerahId: "",
    timGambuhDesaId: "",
    timGambuhKelompokId: "",
    tipeTimGambuh: "",
    umur: "",
  });`);

// 3. States for lists
content = replaceAll(content, `  const [daerahList, setDaerahList] = useState<DaerahOption[]>([]);
  const [desaList, setDesaList] = useState<DesaOption[]>([]);
  const [kelompokList, setKelompokList] = useState<KelompokOption[]>([]);`, `  const [daerahList, setDaerahList] = useState<any[]>([]);
  const [desaList, setDesaList] = useState<any[]>([]);
  const [kelompokList, setKelompokList] = useState<any[]>([]);
  const [filteredDesaList, setFilteredDesaList] = useState<any[]>([]);
  const [filteredKelompokList, setFilteredKelompokList] = useState<any[]>([]);`);

// 4 & 5. setEditForm payloads
content = content.replace(/foto: json\.foto \|\| "",\r?\n\s*}\);/g, `foto: json.foto || "",
          tgDaerahId: "",
          tgDesaId: "",
          timGambuhDaerahId: "",
          timGambuhDesaId: "",
          timGambuhKelompokId: "",
          tipeTimGambuh: "",
          umur: "",
        });`);

content = content.replace(/foto: json\.data\.foto \|\| "",\r?\n\s*}\);/g, `foto: json.data.foto || "",
            tgDaerahId: "",
            tgDesaId: "",
            timGambuhDaerahId: "",
            timGambuhDesaId: "",
            timGambuhKelompokId: "",
            tipeTimGambuh: "",
            umur: "",
          });`);

// 6. fix isTimPnkbGambuhRole
content = replaceAll(content, 'isTimPnkbGambuhRole(data.role)', '(data?.role === "tim_pnkb_gambuh" || data?.role === "tim_pnkb")');

// 7. fix setProfileState
content = replaceAll(content, 'setProfileState(json.data);', 'setData(json.data);');

// 8. fix isTimGambuh &&
content = replaceAll(content, '{isTimGambuh && (', '{isTimGambuhProfile && (');

// 9. Hide Tempat, Tanggal Lahir (Data-grid)
content = content.replace(
  '<div className="data-item">\n                    <label>Tempat, Tanggal Lahir</label>',
  '{!isTimGambuhProfile && (<div className="data-item">\n                    <label>Tempat, Tanggal Lahir</label>'
);
content = content.replace(
  '<div>{data.tempatLahir || "-"}, {data.tanggalLahir || "-"}</div>\n                  </div>',
  '<div>{data.tempatLahir || "-"}, {data.tanggalLahir || "-"}</div>\n                  </div>)}'
);

// 10. Hide Tempat, Tanggal Lahir (Form Inputs)
content = content.replace(
  '<div className="form-row">\n                  <div className="form-group floating-group">\n                    <input\n                      type="text"\n                      className="form-control premium-input"\n                      value={editForm.tempatLahir}',
  '{!isTimGambuhProfile && (<div className="form-row">\n                  <div className="form-group floating-group">\n                    <input\n                      type="text"\n                      className="form-control premium-input"\n                      value={editForm.tempatLahir}'
);

content = content.replace(
  '<label className="floating-label" style={{ top: \'-10px\', fontSize: \'12px\', color: \'#3b82f6\', fontWeight: 500 }}>Tanggal Lahir</label>\n                  </div>\n                </div>',
  '<label className="floating-label" style={{ top: \'-10px\', fontSize: \'12px\', color: \'#3b82f6\', fontWeight: 500 }}>Tanggal Lahir</label>\n                  </div>\n                </div>)}'
);

fs.writeFileSync('app/(dashboard)/profile/page.tsx', content);
console.log('Script completed successfully!');
