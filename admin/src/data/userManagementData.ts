export interface CourseUserStrategy {
  bot_id: string;
  bot_name: string;
  user_id: string;
  creator_name: string;
  asset: string;
  asset_type: string;
  market: string;
  is_paper_trading: boolean;
  created_at: string;
  run_at: string;
  paper_trading_run_at: string;
  paper_trade_first_order: string;
}

export interface CourseBotPerformanceSection {
  avg_return: number;
  max_drawdown: number;
  sharpe: number;
  pnl: Record<string, number>;
  pnl_percent: number[];
  annual_return: number;
}

export interface CourseBotPerformanceTotalDataSection extends CourseBotPerformanceSection {
  avg_loss: number;
  avg_win: number;
  calmar: number;
  profit_factor: number;
  risk_of_ruin: number;
  sortino: number;
  volatility: number;
  win_rate: number;
}

export interface CourseUserProfile {
  user_id: string;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
  is_first_login: boolean;
  subscription_package: string;
  subscription_plan: string;
  registration_plan_date: string;
  plan_expire_date: string;
  paper_trading_bot_limit: number;
  strategies: CourseUserStrategy[];
}

export interface CourseUserPerformanceResponse {
  historical: {
    raw: CourseBotPerformanceSection;
    after_fees: CourseBotPerformanceSection;
  };
  outsample: {
    raw: CourseBotPerformanceSection;
    after_fees: CourseBotPerformanceSection;
  };
  papertrading: {
    raw: CourseBotPerformanceSection;
    after_fees: CourseBotPerformanceSection;
  };
  total_data: {
    raw: CourseBotPerformanceTotalDataSection;
    after_fees: CourseBotPerformanceTotalDataSection;
  };
  asset: string;
  creator_name: string;
  bot_name: string;
  run_at: string;
  paper_trading_run_at: string;
  paper_trade_first_order: string;
  bot_id: string;
  user_id: string;
  is_paper_trading: boolean;
  created_at: string;
  market: string;
  is_public: boolean;
  history_paper_trading: Array<{
    time: string;
    price_close: number;
    position: number;
    position_diff: number;
  }>;
  strategy_code: string | null;
}
