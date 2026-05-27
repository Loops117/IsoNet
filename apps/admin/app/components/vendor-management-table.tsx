"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  filterAndSortVendors,
  vendorStatusFilterOptions,
  type VendorSortDirection,
  type VendorSortField,
  buildVendorLocationLabel,
} from "../../lib/vendor-table";
import {
  formatAdminVendorStatus,
  type AdminVendorSummary,
} from "../../lib/vendor-management";

type VendorManagementTableProps = {
  vendors: AdminVendorSummary[];
  loading: boolean;
  onSelectVendor: (vendorId: string) => void;
};

export function VendorManagementTable({
  vendors,
  loading,
  onSelectVendor,
}: VendorManagementTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<VendorSortField>("company_name");
  const [sortDirection, setSortDirection] = useState<VendorSortDirection>("asc");
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(
    () => new Set(vendorStatusFilterOptions),
  );
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        statusMenuRef.current &&
        !statusMenuRef.current.contains(event.target as Node)
      ) {
        setStatusMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const filteredVendors = useMemo(
    () =>
      filterAndSortVendors({
        vendors,
        searchQuery,
        selectedStatuses,
        sortField,
        sortDirection,
      }),
    [vendors, searchQuery, selectedStatuses, sortField, sortDirection],
  );

  function toggleStatus(status: string) {
    setSelectedStatuses((current) => {
      const next = new Set(current);

      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }

      return next;
    });
  }

  return (
    <section className="vendor-table-panel">
      <div className="vendor-table-toolbar">
        <label className="vendor-table-search">
          <span className="sr-only">Search vendors</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search company, owner, email, location..."
            className="admin-input"
          />
        </label>

        <div className="vendor-table-toolbar__controls">
          <label className="vendor-table-control">
            <span className="vendor-table-control__label">Sort by</span>
            <select
              value={sortField}
              onChange={(event) => setSortField(event.target.value as VendorSortField)}
              className="admin-input"
            >
              <option value="company_name">Company name</option>
              <option value="owner_name">Owner name</option>
              <option value="account_status">Status</option>
              <option value="location">Location</option>
              <option value="start_date">Start date</option>
            </select>
          </label>

          <label className="vendor-table-control">
            <span className="vendor-table-control__label">Order</span>
            <select
              value={sortDirection}
              onChange={(event) =>
                setSortDirection(event.target.value as VendorSortDirection)
              }
              className="admin-input"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </label>

          <div className="vendor-table-control vendor-table-control--menu" ref={statusMenuRef}>
            <span className="vendor-table-control__label">Status</span>
            <button
              type="button"
              className="admin-ghost-button w-full justify-between"
              onClick={() => setStatusMenuOpen((open) => !open)}
              aria-expanded={statusMenuOpen}
            >
              {selectedStatuses.size === vendorStatusFilterOptions.length
                ? "All statuses"
                : `${selectedStatuses.size} selected`}
            </button>

            {statusMenuOpen ? (
              <div className="vendor-status-menu">
                <div className="vendor-status-menu__actions">
                  <button
                    type="button"
                    className="vendor-status-menu__action"
                    onClick={() =>
                      setSelectedStatuses(new Set(vendorStatusFilterOptions))
                    }
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    className="vendor-status-menu__action"
                    onClick={() => setSelectedStatuses(new Set())}
                  >
                    Clear
                  </button>
                </div>
                {vendorStatusFilterOptions.map((status) => (
                  <label key={status} className="vendor-status-menu__option">
                    <input
                      type="checkbox"
                      checked={selectedStatuses.has(status)}
                      onChange={() => toggleStatus(status)}
                    />
                    <span>{formatAdminVendorStatus(status)}</span>
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="vendor-table-wrap">
        <table className="vendor-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Owner</th>
              <th>Location</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="vendor-table__empty">
                  Loading vendors...
                </td>
              </tr>
            ) : filteredVendors.length === 0 ? (
              <tr>
                <td colSpan={4} className="vendor-table__empty">
                  {selectedStatuses.size === 0
                    ? "Select at least one status to show vendors."
                    : "No vendors match your search or filters."}
                </td>
              </tr>
            ) : (
              filteredVendors.map((vendor) => (
                <tr key={vendor.user_id}>
                  <td>
                    <button
                      type="button"
                      className="vendor-table__link"
                      onClick={() => onSelectVendor(vendor.user_id)}
                    >
                      {vendor.company_name}
                    </button>
                  </td>
                  <td>{vendor.owner_name}</td>
                  <td>{buildVendorLocationLabel(vendor)}</td>
                  <td>
                    <span className="vendor-table__status">
                      {formatAdminVendorStatus(vendor.account_status)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="vendor-table__meta">
        Showing {filteredVendors.length} of {vendors.length} vendors
      </p>
    </section>
  );
}
