import os
import resend


def send_failure_report(user_email: str, flow_id: str, report: dict, flow_name: str | None = None) -> None:
    """
    Send a QA run failure report via Resend.
    Requires RESEND_API_KEY and RESEND_FROM in environment.
    """
    api_key = os.getenv("RESEND_API_KEY")
    from_address = os.getenv("RESEND_FROM", "Hawktrace <onboarding@resend.dev>")

    if not api_key:
        print(f"[notify] RESEND_API_KEY not set — skipping email for flow {flow_id}")
        return

    resend.api_key = api_key
    subject, html = _build_email(report, flow_name=flow_name)

    try:
        resend.Emails.send({
            "from": from_address,
            "to": [user_email],
            "subject": subject,
            "html": html,
        })
        print(f"[notify] failure report sent to {user_email} for flow {flow_id}")
    except Exception as e:
        print(f"[notify] failed to send email to {user_email}: {e}")


def _build_email(report: dict, flow_name: str | None = None) -> tuple[str, str]:
    goal = report.get("goal") or "Unknown flow"
    summary = report.get("summary", "")
    ran_at = report.get("ran_at", "")
    step_results = report.get("step_results", [])

    subject = f"Hawktrace: QA run failed — {flow_name or goal}"

    step_rows = ""
    for r in step_results:
        if r["status"] == "passed":
            color, icon = "#16a34a", "✓"
        elif r["status"] == "failed":
            color, icon = "#dc2626", "✗"
        else:
            color, icon = "#9ca3af", "–"

        reason_row = ""
        if r.get("failure_reason"):
            reason_row = f"""
            <tr>
              <td colspan="2" style="padding:4px 16px 8px 36px;font-size:12px;color:#6b7280;">
                {r['failure_reason']}
              </td>
            </tr>"""

        step_rows += f"""
        <tr>
          <td style="padding:8px 16px;font-size:13px;color:{color};font-weight:600;">{icon}</td>
          <td style="padding:8px 4px;font-size:13px;color:#111827;">
            Step {r['step_id']}: {r['description']}
          </td>
        </tr>{reason_row}"""

    html = f"""
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,sans-serif;">
      <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:8px;
                  border:1px solid #e5e7eb;overflow:hidden;">

        <div style="background:#111827;padding:24px 32px;">
          <span style="color:#f97316;font-weight:700;font-size:18px;letter-spacing:-0.3px;">
            Hawktrace
          </span>
        </div>

        <div style="padding:32px;">
          <h2 style="margin:0 0 4px;font-size:18px;color:#111827;">QA Run Failed</h2>
          <p style="margin:0 0 24px;font-size:13px;color:#6b7280;">{ran_at}</p>

          {'<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px 20px;margin-bottom:12px;"><p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Flow</p><p style="margin:0;font-size:14px;color:#111827;font-weight:500;">' + flow_name + '</p></div>' if flow_name else ''}

          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;
                      padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;
                      letter-spacing:0.05em;">Flow Goal</p>
            <p style="margin:0;font-size:14px;color:#111827;font-weight:500;">{goal}</p>
          </div>

          <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#374151;">{summary}</p>

          <table style="width:100%;border-collapse:collapse;">
            {step_rows}
          </table>

          <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Review your flows in the Hawktrace dashboard.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
    """

    return subject, html
