export default function Pagination({ page, pageSize, totalItems, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems <= pageSize) return null;

  const currentPage = Math.min(page, totalPages);
  const firstItem = (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);

  return <div className="pagination" aria-label="Phân trang danh sách">
    <span className="pagination-summary">{firstItem}-{lastItem} / {totalItems}</span>
    <div className="pagination-controls">
      <button className="btn-secondary pagination-button" type="button" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} aria-label="Trang trước">←</button>
      <span className="pagination-page">Trang {currentPage} / {totalPages}</span>
      <button className="btn-secondary pagination-button" type="button" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)} aria-label="Trang sau">→</button>
    </div>
  </div>;
}