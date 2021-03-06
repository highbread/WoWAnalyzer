import React from 'react';
import SPELLS from 'common/SPELLS';
import SpellLink from 'common/SpellLink';
import { formatPercentage } from 'common/format';
import Statistic from 'interface/statistics/Statistic';
import AbilityTracker from 'parser/shared/modules/AbilityTracker';
import Analyzer from 'parser/core/Analyzer';
import { STATISTIC_ORDER } from 'interface/others/StatisticBox';
import BoringSpellValueText from 'interface/statistics/components/BoringSpellValueText/index';

const CB_DURATION = 15000;
const debug = false;

class ComboBreaker extends Analyzer {
  static dependencies = {
    abilityTracker: AbilityTracker,
  };
  CBProcsTotal = 0;
  lastCBProcTime = null;
  consumedCBProc = 0;
  overwrittenCBProc = 0;

  on_byPlayer_applybuff(event) {
    const spellId = event.ability.guid;
    if (SPELLS.COMBO_BREAKER_BUFF.id === spellId) {
      this.lastCBProcTime = event.timestamp;
      debug && console.log('CB Proc Applied');
      this.CBProcsTotal += 1;
    }
  }

  on_byPlayer_refreshbuff(event) {
    const spellId = event.ability.guid;
    if (SPELLS.COMBO_BREAKER_BUFF.id === spellId) {
      this.lastCBProcTime = event.timestamp;
      debug && console.log('CB Proc Overwritten');
      this.CBProcsTotal += 1;
      this.overwrittenCBProc += 1;
    }
  }
  on_byPlayer_cast(event) {
    const spellId = event.ability.guid;
    if (SPELLS.BLACKOUT_KICK.id !== spellId) {
      return;
    }
    if (this.lastCBProcTime !== event.timestamp) {
     if (this.lastCBProcTime === null) {
        return;
      }
      const cbTimeframe = this.lastCBProcTime + CB_DURATION;
      if (event.timestamp <= cbTimeframe) {
       this.consumedCBProc += 1;
        debug && console.log(`CB Proc Consumed / Timestamp: ${event.timestamp}`);
       this.lastCBProcTime = null;
      }
    }
  }

  get usedCBProcs() {
    return this.consumedCBProc / this.CBProcsTotal;
  }

  get suggestionThresholds() {
    return {
      actual: this.usedCBProcs,
      isLessThan: {
        minor: 0.9,
        average: 0.8,
        major: 0.7,
      },
      style: 'percentage',
    };
  }

  suggestions(when) {
    when(this.suggestionThresholds).addSuggestion((suggest, actual, recommended) => {
        return suggest(<span>Your <SpellLink id={SPELLS.COMBO_BREAKER_BUFF.id} /> procs should be used before you tiger palm again so they are not overwritten. While some will be overwritten due to higher priority of getting Chi for spenders, wasting <SpellLink id={SPELLS.COMBO_BREAKER_BUFF.id} /> procs is not optimal.</span>)
          .icon(SPELLS.COMBO_BREAKER_BUFF.icon)
          .actual(`${formatPercentage(actual)}% used Combo Breaker procs`)
          .recommended(`>${formatPercentage(recommended)}% used Combo Breaker Procs is recommended`);
    });
  }

  statistic() {
    const averageCBProcs = this.abilityTracker.getAbility(SPELLS.TIGER_PALM.id).casts * (this.selectedCombatant.hasTrait(SPELLS.PRESSURE_POINT.id) ? 0.1 : 0.08);
    return (
      <Statistic
        position={STATISTIC_ORDER.CORE(6)}
        size="flexible"
        tooltip={<>You got a total of <strong>{this.CBProcsTotal} Combo Breaker procs</strong> and <strong>used {this.consumedCBProc}</strong> of them. The average expected number of procs from your Tiger Palms this fight is <strong>{averageCBProcs.toFixed(2)}</strong>, and you got <strong>{this.CBProcsTotal}</strong>.</>}
      >
      <BoringSpellValueText spell={SPELLS.COMBO_BREAKER_BUFF}>
          {formatPercentage(this.usedCBProcs, 0)}% <small>Proc utilization</small>
      </BoringSpellValueText>
    </Statistic>
   );
  }
}

export default ComboBreaker;
