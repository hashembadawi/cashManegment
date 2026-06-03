import { useEffect, useMemo, useState } from 'react'
import { api, getAuthToken, setAuthToken } from './api'
import './App.css'

function App() {
  const currencyOptions = [
    { value: 'USD', label: 'دولار أمريكي (USD)' },
    { value: 'TRY', label: 'ليرة تركية (TRY)' },
    { value: 'SYP', label: 'ليرة سورية (SYP)' },
  ]

  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getAuthToken()))
  const [activeView, setActiveView] = useState('boxes')
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('cash_user')
    return raw ? JSON.parse(raw) : null
  })

  const [boxes, setBoxes] = useState([])
  const [selectedBoxId, setSelectedBoxId] = useState('')
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState([])
  const [userForm, setUserForm] = useState({ username: '', password: '', role: 'user' })
  const [userNotice, setUserNotice] = useState('')

  const emptyBoxForm = {
    id: '',
    name: '',
    description: '',
    openingBalance: 0,
    currency: 'USD',
  }

  const emptyTransactionForm = {
    id: '',
    type: 'receipt',
    calcMode: 'fixed',
    amount: '',
    quantity: '',
    unitPrice: '',
    note: '',
    transactionDate: '',
  }

  const [boxForm, setBoxForm] = useState(emptyBoxForm)
  const [transactionForm, setTransactionForm] = useState(emptyTransactionForm)

  const selectedBox = useMemo(
    () => boxes.find((box) => box._id === selectedBoxId),
    [boxes, selectedBoxId]
  )

  const totals = useMemo(
    () => ({
      boxesCount: boxes.length,
    }),
    [boxes]
  )

  const formatMoney = (value, currency = 'USD') => {
    try {
      return new Intl.NumberFormat('ar-EG-u-nu-latn', {
        style: 'currency',
        currency,
      }).format(Number(value || 0))
    } catch {
      return `${Number(value || 0).toFixed(2)} ${currency}`
    }
  }

  const formatDate = (isoDate) => {
    return new Date(isoDate).toLocaleDateString('ar-EG-u-nu-latn', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    })
  }

  const logout = () => {
    setAuthToken('')
    localStorage.removeItem('cash_user')
    setUser(null)
    setIsAuthenticated(false)
    setBoxes([])
    setTransactions([])
    setSelectedBoxId('')
    setUsers([])
    setError('')
    setUserNotice('')
    setActiveView('boxes')
  }

  const submitLogin = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')

    try {
      const payload = await api.login(loginForm)
      setAuthToken(payload.token)
      localStorage.setItem('cash_user', JSON.stringify(payload.user))
      setUser(payload.user)
      setIsAuthenticated(true)
      setActiveView('boxes')
      setLoginForm({ username: '', password: '' })
    } catch (err) {
      if (String(err.message).toLowerCase().includes('invalid username or password')) {
        setError('بيانات الدخول غير صحيحة.')
      } else {
        setError(`تعذر تسجيل الدخول: ${err.message}`)
      }
    } finally {
      setBusy(false)
    }
  }

  const loadBoxes = async (searchValue = '') => {
    if (!isAuthenticated) {
      return
    }

    setError('')
    setLoading(true)
    try {
      const payload = await api.getBoxes(searchValue)
      setBoxes(payload)

      if (!payload.length) {
        setSelectedBoxId('')
        setTransactions([])
      } else if (!payload.some((b) => b._id === selectedBoxId)) {
        setSelectedBoxId(payload[0]._id)
      }
    } catch (err) {
      if (err.message.toLowerCase().includes('unauthorized')) {
        logout()
        return
      }
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    if (!isAuthenticated || user?.role !== 'admin') {
      return
    }

    setError('')
    try {
      const payload = await api.getUsers()
      setUsers(payload)
    } catch (err) {
      if (err.message.toLowerCase().includes('unauthorized')) {
        logout()
        return
      }
      setError(err.message)
    }
  }

  const loadTransactions = async (boxId) => {
    if (!boxId) {
      setTransactions([])
      return
    }

    setError('')
    try {
      const payload = await api.getTransactions(boxId)
      setTransactions(payload.transactions)
      setBoxes((prev) => prev.map((box) => (box._id === payload.box._id ? payload.box : box)))
    } catch (err) {
      if (err.message.toLowerCase().includes('unauthorized')) {
        logout()
        return
      }
      setError(err.message)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadBoxes()
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      loadUsers()
    }
  }, [isAuthenticated, user?.role])

  useEffect(() => {
    loadTransactions(selectedBoxId)
  }, [selectedBoxId])

  const resetBoxForm = () => setBoxForm(emptyBoxForm)
  const resetTransactionForm = () => setTransactionForm(emptyTransactionForm)

  const submitBox = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')

    try {
      const payload = {
        name: boxForm.name,
        description: boxForm.description,
        openingBalance: Number(boxForm.openingBalance || 0),
        currency: boxForm.currency,
      }

      if (boxForm.id) {
        const updated = await api.updateBox(boxForm.id, payload)
        setBoxes((prev) => prev.map((box) => (box._id === updated._id ? updated : box)))
      } else {
        const created = await api.createBox(payload)
        setBoxes((prev) => [created, ...prev])
        setSelectedBoxId(created._id)
      }

      resetBoxForm()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const editBox = (box) => {
    setBoxForm({
      id: box._id,
      name: box.name,
      description: box.description || '',
      openingBalance: box.openingBalance,
      currency: box.currency || 'USD',
    })
  }

  const removeBox = async (boxId) => {
    if (!window.confirm('هل أنت متأكد من حذف الصندوق وكل عملياته؟')) return

    setBusy(true)
    setError('')
    try {
      await api.deleteBox(boxId)
      const nextBoxes = boxes.filter((box) => box._id !== boxId)
      setBoxes(nextBoxes)
      if (selectedBoxId === boxId) {
        const next = nextBoxes[0]?._id || ''
        setSelectedBoxId(next)
        if (!next) setTransactions([])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const submitTransaction = async (event) => {
    event.preventDefault()

    if (!selectedBoxId) {
      setError('اختر صندوقا اولا قبل تسجيل اي عملية.')
      return
    }

    setBusy(true)
    setError('')

    try {
      const computedAmount =
        transactionForm.calcMode === 'byQuantity'
          ? Number(transactionForm.quantity) * Number(transactionForm.unitPrice)
          : Number(transactionForm.amount)

      if (Number.isNaN(computedAmount) || computedAmount <= 0) {
        setError('ادخل قيمة صحيحة للمبلغ أو للكمية والسعر.')
        setBusy(false)
        return
      }

      const payload = {
        type: transactionForm.type,
        amount: Number(computedAmount.toFixed(2)),
        note: transactionForm.note,
        transactionDate: transactionForm.transactionDate || undefined,
      }

      const data = transactionForm.id
        ? await api.updateTransaction(transactionForm.id, payload)
        : await api.createTransaction(selectedBoxId, payload)

      setTransactions(data.transactions)
      setBoxes((prev) => prev.map((box) => (box._id === data.box._id ? data.box : box)))
      resetTransactionForm()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const editTransaction = (transaction) => {
    setTransactionForm({
      id: transaction._id,
      type: transaction.type,
      calcMode: 'fixed',
      amount: transaction.amount,
      quantity: '',
      unitPrice: '',
      note: transaction.note || '',
      transactionDate: new Date(transaction.transactionDate).toISOString().slice(0, 10),
    })
  }

  const removeTransaction = async (transactionId) => {
    if (!window.confirm('هل تريد حذف العملية فعلا؟')) return

    setBusy(true)
    setError('')
    try {
      const data = await api.deleteTransaction(transactionId)
      setTransactions(data.transactions)
      setBoxes((prev) => prev.map((box) => (box._id === data.box._id ? data.box : box)))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const submitNewUser = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setUserNotice('')

    try {
      const payload = await api.createUser(userForm)
      setUsers((prev) => [payload, ...prev])
      setUserForm({ username: '', password: '', role: 'user' })
      setUserNotice('تم إنشاء المستخدم بنجاح.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="login-page" dir="rtl">
        <div className="login-card">
          <p className="eyebrow">تسجيل الدخول</p>
          <h1>نظام إدارة صناديق الكاش</h1>
          <p className="subtitle">ادخل اسم المستخدم وكلمة السر للمتابعة.</p>
          {error && <p className="error-banner">{error}</p>}
          <form className="form" onSubmit={submitLogin}>
            <input
              required
              placeholder="اسم المستخدم"
              value={loginForm.username}
              onChange={(event) =>
                setLoginForm((prev) => ({ ...prev, username: event.target.value }))
              }
            />
            <input
              required
              type="password"
              placeholder="كلمة السر"
              value={loginForm.password}
              onChange={(event) =>
                setLoginForm((prev) => ({ ...prev, password: event.target.value }))
              }
            />
            <button type="submit" disabled={busy}>
              دخول
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="page" dir="rtl">
      <header className="hero">
        <div className="header-actions">
          <p className="user-chip">المستخدم: {user?.username || 'admin'}</p>
          <button type="button" className="secondary" onClick={logout}>
            تسجيل الخروج
          </button>
        </div>
        <h1>ادارة صناديق الكاش</h1>
        <div className="stats">
          <article className="stat-card">
            <span>عدد الصناديق</span>
            <strong>{totals.boxesCount}</strong>
          </article>
        </div>
        {user?.role === 'admin' && (
          <div className="view-switch">
            <button
              type="button"
              className={activeView === 'boxes' ? '' : 'secondary'}
              onClick={() => setActiveView('boxes')}
            >
              الصناديق
            </button>
            <button
              type="button"
              className={activeView === 'users' ? '' : 'secondary'}
              onClick={() => setActiveView('users')}
            >
              إدارة المستخدمين
            </button>
          </div>
        )}
      </header>

      {error && <p className="error-banner">{error}</p>}
      {userNotice && <p className="ok-banner">{userNotice}</p>}

      {activeView === 'boxes' && (
        <main className="layout">
        <section className="panel">
          <div className="panel-head">
            <h2>الصناديق</h2>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث باسم الصندوق"
            />
            <button
              type="button"
              onClick={() => loadBoxes(search)}
              className="secondary"
              disabled={loading || busy}
            >
              بحث
            </button>
          </div>

          <div className="box-list">
            {loading && <p>جار تحميل البيانات...</p>}
            {!loading && !boxes.length && <p>لا توجد صناديق حتى الان.</p>}

            {boxes.map((box) => (
              <article
                key={box._id}
                className={`box-card ${box._id === selectedBoxId ? 'active' : ''}`}
                onClick={() => setSelectedBoxId(box._id)}
              >
                <h3>{box.name}</h3>
                <p>{box.description || 'بدون وصف'}</p>
                <strong className={Number(box.currentBalance) < 0 ? 'negative-amount' : ''}>
                  {formatMoney(box.currentBalance, box.currency)}
                </strong>
                <div className="inline-actions">
                  <button
                    type="button"
                    className="ghost"
                    onClick={(event) => {
                      event.stopPropagation()
                      editBox(box)
                    }}
                  >
                    تعديل
                  </button>
                  <button
                    type="button"
                    className="ghost danger"
                    onClick={(event) => {
                      event.stopPropagation()
                      removeBox(box._id)
                    }}
                  >
                    حذف
                  </button>
                </div>
              </article>
            ))}
          </div>

          <form className="form" onSubmit={submitBox}>
            <h3>{boxForm.id ? 'تعديل صندوق' : 'اضافة صندوق جديد'}</h3>
            <input
              required
              value={boxForm.name}
              onChange={(event) => setBoxForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="اسم الصندوق"
            />
            <textarea
              rows="2"
              value={boxForm.description}
              onChange={(event) =>
                setBoxForm((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="وصف مختصر"
            />
            <div className="row">
              <input
                type="number"
                min="0"
                step="0.01"
                value={boxForm.openingBalance}
                onChange={(event) =>
                  setBoxForm((prev) => ({ ...prev, openingBalance: event.target.value }))
                }
                placeholder="الرصيد الابتدائي"
              />
              <select
                value={boxForm.currency}
                onChange={(event) =>
                  setBoxForm((prev) => ({ ...prev, currency: event.target.value }))
                }
              >
                {currencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="inline-actions">
              <button type="submit" disabled={busy}>
                {boxForm.id ? 'حفظ التعديل' : 'انشاء الصندوق'}
              </button>
              {boxForm.id && (
                <button type="button" className="secondary" onClick={resetBoxForm}>
                  الغاء
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>عمليات الصندوق</h2>
            <p className="selected-box-name">
              {selectedBox ? `الصندوق الحالي: ${selectedBox.name}` : 'اختر صندوقا لعرض العمليات'}
            </p>
          </div>

          <form className="form" onSubmit={submitTransaction}>
            <h3>{transactionForm.id ? 'تعديل عملية' : 'اضافة عملية قبض او دفع'}</h3>
            <select
              value={transactionForm.calcMode}
              onChange={(event) =>
                setTransactionForm((prev) => ({
                  ...prev,
                  calcMode: event.target.value,
                  amount: '',
                  quantity: '',
                  unitPrice: '',
                }))
              }
            >
              <option value="fixed">مبلغ محدد</option>
              <option value="byQuantity">كمية × سعر</option>
            </select>
            <div className="row">
              <select
                value={transactionForm.type}
                onChange={(event) =>
                  setTransactionForm((prev) => ({ ...prev, type: event.target.value }))
                }
              >
                <option value="receipt">قبض</option>
                <option value="payment">دفع</option>
              </select>
              {transactionForm.calcMode === 'fixed' ? (
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={transactionForm.amount}
                  onChange={(event) =>
                    setTransactionForm((prev) => ({ ...prev, amount: event.target.value }))
                  }
                  placeholder="المبلغ"
                />
              ) : (
                <div className="row amount-math">
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={transactionForm.quantity}
                    onChange={(event) =>
                      setTransactionForm((prev) => ({ ...prev, quantity: event.target.value }))
                    }
                    placeholder="الكمية"
                  />
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={transactionForm.unitPrice}
                    onChange={(event) =>
                      setTransactionForm((prev) => ({ ...prev, unitPrice: event.target.value }))
                    }
                    placeholder="السعر"
                  />
                </div>
              )}
            </div>
            {transactionForm.calcMode === 'byQuantity' && (
              <p className="calc-preview">
                المبلغ الناتج: {formatMoney(Number(transactionForm.quantity || 0) * Number(transactionForm.unitPrice || 0), selectedBox?.currency || 'USD')}
              </p>
            )}
            <input
              type="date"
              value={transactionForm.transactionDate}
              onChange={(event) =>
                setTransactionForm((prev) => ({ ...prev, transactionDate: event.target.value }))
              }
            />
            <textarea
              rows="2"
              value={transactionForm.note}
              onChange={(event) =>
                setTransactionForm((prev) => ({ ...prev, note: event.target.value }))
              }
              placeholder="ملاحظة"
            />
            <div className="inline-actions">
              <button type="submit" disabled={busy || !selectedBoxId}>
                {transactionForm.id ? 'حفظ العملية' : 'تسجيل العملية'}
              </button>
              {transactionForm.id && (
                <button type="button" className="secondary" onClick={resetTransactionForm}>
                  الغاء
                </button>
              )}
            </div>
          </form>

          <div className="transactions">
            {!selectedBoxId && <p>لا توجد بيانات لعرضها حاليا.</p>}

            {!!selectedBoxId && !transactions.length && <p>لا توجد عمليات لهذا الصندوق حتى الان.</p>}

            {transactions.map((transaction) => (
              <article key={transaction._id} className="transaction-item">
                <div>
                  <p>
                    <span className={transaction.type === 'receipt' ? 'badge in' : 'badge out'}>
                      {transaction.type === 'receipt' ? 'قبض' : 'دفع'}
                    </span>
                    {formatMoney(transaction.amount, selectedBox?.currency || 'USD')}
                  </p>
                  <small>{formatDate(transaction.transactionDate)}</small>
                  {transaction.note && <p className="note">{transaction.note}</p>}
                </div>
                <div className="inline-actions">
                  <button type="button" className="ghost" onClick={() => editTransaction(transaction)}>
                    تعديل
                  </button>
                  <button
                    type="button"
                    className="ghost danger"
                    onClick={() => removeTransaction(transaction._id)}
                  >
                    حذف
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
        </main>
      )}

      {activeView === 'users' && user?.role === 'admin' && (
        <main className="single-layout">
          <section className="panel">
            <div className="panel-head">
              <h2>إضافة مستخدم جديد</h2>
              <p className="selected-box-name">كل مستخدم جديد سيرى صناديقه الخاصة فقط بعد تسجيل الدخول.</p>
            </div>

            <form className="form" onSubmit={submitNewUser}>
              <input
                required
                minLength="3"
                value={userForm.username}
                onChange={(event) =>
                  setUserForm((prev) => ({ ...prev, username: event.target.value }))
                }
                placeholder="اسم المستخدم"
              />
              <input
                required
                minLength="6"
                type="password"
                value={userForm.password}
                onChange={(event) =>
                  setUserForm((prev) => ({ ...prev, password: event.target.value }))
                }
                placeholder="كلمة المرور"
              />
              <select
                value={userForm.role}
                onChange={(event) => setUserForm((prev) => ({ ...prev, role: event.target.value }))}
              >
                <option value="user">مستخدم عادي</option>
                <option value="admin">مدير</option>
              </select>
              <div className="inline-actions">
                <button type="submit" disabled={busy}>
                  إنشاء المستخدم
                </button>
              </div>
            </form>

            <div className="users-list">
              <h3>المستخدمون الحاليون</h3>
              {!users.length && <p>لا يوجد مستخدمون حاليا.</p>}
              {users.map((listedUser) => (
                <article key={listedUser._id || listedUser.id} className="user-item">
                  <strong>{listedUser.username}</strong>
                  <span>{listedUser.role === 'admin' ? 'مدير' : 'مستخدم'}</span>
                </article>
              ))}
            </div>
          </section>
        </main>
      )}
    </div>
  )
}

export default App
