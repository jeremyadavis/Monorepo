import { useEffect, useRef, useState } from "react";
import { NormalizationResponse } from "~/lib/normalization/hooks";
import { ResponseId } from "./Fields";
import Dialog from "./Dialog";
import { FieldValue } from "./FieldValue";

const NormToken = ({
  id,
  responses,
  pattern,
  variant = "normal",
}: {
  id: string;
  responses: NormalizationResponse[];
  pattern?: string;
  variant?: "normal" | "custom";
}) => {
  const [showModal, setShowModal] = useState(false);

  const tokenResponses = responses.filter((r) =>
    r?.normalizedValue?.includes(id)
  );

  if (pattern === "custom_normalization") {
    variant = "custom";
  }

  return (
    <>
      <span data-tooltip={pattern}>
        <a
          role="button"
          href="#"
          className={`normalization-token normalization-token-${variant}`}
          onClick={(e) => {
            e.preventDefault();
            setShowModal(true);
          }}
        >
          <code>{id}</code>
        </a>
      </span>

      {showModal && (
        <Dialog
          showModal={showModal}
          setShowModal={setShowModal}
          header={
            <span>
              Answers matching <code>{id}</code> ({tokenResponses.length})
            </span>
          }
        >
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Answer</th>
                <th>ResponseId</th>
              </tr>
            </thead>
            <tbody>
              {tokenResponses?.map((response, i) => {
                const { value, normalizedValue, patterns, responseId } =
                  response;
                return (
                  <tr key={i}>
                    <td>{i + 1}.</td>
                    <td>
                      <FieldValue
                        currentTokenId={id}
                        value={value}
                        normalizedValue={normalizedValue}
                        patterns={patterns}
                      />
                    </td>
                    <td>
                      <ResponseId id={responseId} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Dialog>
      )}
    </>
  );
};

export default NormToken;
