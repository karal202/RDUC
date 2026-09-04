import { useState } from "react";
import Pagination from "./Pagination";

const PAGE_SIZE = 10;

export default function LogsTab({ logs, filter, setFilter, formatDate }) {
  const [page, setPage] = useState(1);
  const term = filter.trim().toLowerCase();
  const filtered = term ? logs.filter((log) => [log.ip_address, log.device_hash, log.key_code].some((value) => (value || "").toLowerCase().includes(term))) : logs;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return <><div className="panel"><div className="panel-header"><h3>🔍 Tra cứu Nhật ký theo IP / HWID / Key</h3></div><div className="form-group"><input placeholder="Nhập IP Máy hoặc Mã HWID..." value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }} /></div></div><div className="panel"><div className="panel-header"><h3>📜 Nhật ký Kích hoạt</h3></div><div className="table-container"><table><thead><tr><th>ID</th><th>IP</th><th>KEY</th><th>HWID</th><th>KẾT QUẢ</th><th>THỜI GIAN</th></tr></thead><tbody>{visibleItems.map((log) => <tr key={log.id}><td>#{log.id}</td><td>{log.ip_address || "127.0.0.1"}</td><td>{log.key_code || "—"}</td><td>{log.device_hash ? `${log.device_hash.slice(0, 16)}...` : "—"}</td><td><span className={`badge ${log.result}`}>{log.result}</span></td><td>{formatDate(log.created_at)}</td></tr>)}</tbody></table></div><Pagination page={safePage} pageSize={PAGE_SIZE} totalItems={filtered.length} onPageChange={setPage} /></div></>;
}
