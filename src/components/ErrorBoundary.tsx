import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  handleReset = () => {
    // 관련 localStorage 데이터 초기화
    try {
      localStorage.removeItem('shinhan-gap-ratio')
      localStorage.removeItem('shinhan-coverage')
    } catch {}
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
          <div className="rounded-lg border border-danger-100 bg-danger-100 px-6 py-4">
            <h3 className="text-sm font-bold text-danger-700">페이지 렌더링 오류</h3>
            <p className="mt-1 text-xs text-danger-600">
              {this.state.error?.message || '알 수 없는 오류가 발생했습니다.'}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            데이터 초기화 후 새로고침
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
