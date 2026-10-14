import { Component, type ReactNode } from "react";
import { Link } from "react-router";
import { withTranslation, type WithTranslation } from "react-i18next";
class RouteErrorBoundaryBase extends Component<WithTranslation & { children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <section role="alert" className="mx-auto max-w-xl p-8 pt-28 text-center">
      <h1 className="text-xl font-bold">{this.props.t("checkout.pageError")}</h1>
      <Link to="/my-bookings" className="block py-4 underline">{this.props.t("checkout.returnToBookings")}</Link>
      <button onClick={() => this.setState({ failed: false })}>{this.props.t("booking.notFound.retry")}</button>
    </section>;
  }
}
export const RouteErrorBoundary = withTranslation()(RouteErrorBoundaryBase);
