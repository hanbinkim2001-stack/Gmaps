import { useMemo } from "react";
import type { PlaceWithExtras } from "../types/place";

type Props = {
  place: PlaceWithExtras | null;
  onClose: () => void;
};

/**
 * 네이버 기본 정보 + extras 레이어를 구역으로 나눠 표시
 * extras 키/값은 data/extras.ts 에만 추가하면 됩니다.
 */
export function PlaceDetailPanel({ place, onClose }: Props) {
  if (!place) return null;

  const { base, extra } = place;

  const naverLink = useMemo(() => {
    const link = base.naverLink?.trim();
    if (!link) return null;
    // http(s)만 허용
    if (!/^https?:\/\//i.test(link)) return null;
    return link;
  }, [base.naverLink]);

  const addMenu = () => {
    const name = menuName.trim();
    const price = menuPrice.trim();
    if (!name) return;
    const next: PlaceUserData = {
      ...userData,
      menu: [{ name, price: price || undefined }, ...userData.menu],
    };
    setUserData(next);
    savePlaceUserData(base.id, next);
    setMenuName("");
    setMenuPrice("");
  };

  const removeMenu = (idx: number) => {
    const next: PlaceUserData = {
      ...userData,
      menu: userData.menu.filter((_, i) => i !== idx),
    };
    setUserData(next);
    savePlaceUserData(base.id, next);
  };

  const addReview = () => {
    const text = reviewText.trim();
    if (!text) return;
    const rating = Math.min(5, Math.max(1, Math.round(reviewRating)));
    const next: PlaceUserData = {
      ...userData,
      reviews: [
        { rating, text, createdAt: new Date().toISOString() },
        ...userData.reviews,
      ],
    };
    setUserData(next);
    savePlaceUserData(base.id, next);
    setReviewRating(5);
    setReviewText("");
  };

  const removeReview = (idx: number) => {
    const next: PlaceUserData = {
      ...userData,
      reviews: userData.reviews.filter((_, i) => i !== idx),
    };
    setUserData(next);
    savePlaceUserData(base.id, next);
  };

  return (
    <aside className="detail-panel" role="dialog" aria-label="장소 상세">
      <header className="detail-panel__head">
        <h2 className="detail-panel__title">{base.title}</h2>
        <button
          type="button"
          className="detail-panel__close"
          onClick={onClose}
          aria-label="닫기"
        >
          ×
        </button>
      </header>

      <section className="detail-panel__section">
        <h3 className="detail-panel__label">네이버 기본 정보</h3>
        <dl className="detail-panel__dl">
          <div>
            <dt>위치</dt>
            <dd>
              {base.lat.toFixed(5)}, {base.lng.toFixed(5)}
            </dd>
          </div>
          {base.address ? (
            <div>
              <dt>주소</dt>
              <dd>{base.address}</dd>
            </div>
          ) : null}
          {base.phone ? (
            <div>
              <dt>전화</dt>
              <dd>{base.phone}</dd>
            </div>
          ) : null}
          {base.category ? (
            <div>
              <dt>카테고리</dt>
              <dd>{base.category}</dd>
            </div>
          ) : null}
          {base.description ? (
            <div>
              <dt>설명</dt>
              <dd>{base.description}</dd>
            </div>
          ) : null}
          {naverLink ? (
            <div>
              <dt>네이버</dt>
              <dd>
                <a
                  className="detail-panel__link"
                  href={naverLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  네이버에서 리뷰/메뉴 보기
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="detail-panel__section">
        <h3 className="detail-panel__label">추가 정보 (우리 서비스)</h3>
        {!extra || Object.keys(extra).length === 0 ? (
          <p className="detail-panel__empty">
            <code>src/data/extras.ts</code>에 이 장소 id(
            <strong>{base.id}</strong>)를 키로 항목을 추가하세요.
          </p>
        ) : (
          <dl className="detail-panel__dl">
            {Object.entries(extra).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{formatExtraValue(value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="detail-panel__section">
        <h3 className="detail-panel__label">추가 서비스</h3>
        <p className="detail-panel__empty">추가 서비스 추가 예정</p>
      </section>
    </aside>
  );
}

function formatExtraValue(
  value: string | number | boolean | string[] | undefined
): string {
  if (value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}
